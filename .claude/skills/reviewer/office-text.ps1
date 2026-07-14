# Dumps the text of a .pptx or .docx so Claude can read it.
#
# Both are zips of XML, and the Read tool can't open either. This pulls out the text
# runs, keeping paragraph breaks and (for decks) slide order and speaker notes:
# lecturers hide the real definitions in the notes.
#
# Keep this file ASCII-only. PowerShell 5.1 reads a UTF-8 script as Windows-1252, so
# a stray em dash decodes into a smart quote, which PS treats as a real string
# delimiter - the whole script then fails to parse.
#
# PDFs do NOT need this: the Read tool reads them directly, via its `pages` param.
# Legacy .ppt/.doc are a different, binary format - re-save them as .pptx/.docx.
#
# Usage: powershell -File office-text.ps1 -Path lecture.pptx [-NoNotes]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [switch]$NoNotes
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "No such file: $Path"
    exit 1
}

$full = (Resolve-Path -LiteralPath $Path).Path
$ext = [System.IO.Path]::GetExtension($full).ToLower()

if ($ext -eq ".ppt" -or $ext -eq ".doc") {
    Write-Error "$ext is the old binary format. Open it and Save As .$($ext)x first."
    exit 1
}
if ($ext -ne ".pptx" -and $ext -ne ".docx") {
    Write-Error "Expected .pptx or .docx, got $ext. (PDFs: use the Read tool instead.)"
    exit 1
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($full)

# PowerPoint wraps text in <a:t> inside <a:p>; Word uses <w:t> inside <w:p>. Same
# shape, different namespace, so one extractor with the tag names passed in.
function Convert-PartToText($entry, $t, $p) {
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $xml = $reader.ReadToEnd()
    $reader.Close()

    $xml = $xml -replace "</${p}>", "</${p}>`n"

    # A hard line break (<w:br/>, <a:br/>) or tab sits BETWEEN two text runs, and we
    # only ever collect what is inside the run tags - so rewrite it into a run of its
    # own. Replacing it with a bare space would drop it, gluing "Item one" to
    # "Item two".
    $xml = $xml -replace '<(w|a):(br|tab)\s*/>', "<${t}> </${t}>"

    $lines = foreach ($line in $xml -split "`n") {
        $runs = [regex]::Matches($line, "<${t}(?:\s[^>]*)?>(.*?)</${t}>", 'Singleline')
        if ($runs.Count -gt 0) {
            $text = ($runs | ForEach-Object { $_.Groups[1].Value }) -join ''
            # Entities back to characters. Ampersand last, or it double-decodes.
            $text = $text -replace '&lt;', '<' -replace '&gt;', '>' `
                -replace '&quot;', '"' -replace '&apos;', "'" -replace '&amp;', '&'
            $text.Trim()
        }
    }
    ($lines | Where-Object { $_ -ne '' }) -join "`n"
}

# Office writes OPC paths with forward slashes, but some zip writers use backslashes.
# Normalise so a part is found either way.
function Get-PartName($entry) { $entry.FullName -replace '\\', '/' }

try {
    if ($ext -eq ".docx") {
        $doc = $zip.Entries | Where-Object { (Get-PartName $_) -eq 'word/document.xml' }
        if (-not $doc) {
            Write-Error "No word/document.xml. Is $Path really a .docx?"
            exit 1
        }
        $body = Convert-PartToText $doc[0] 'w:t' 'w:p'
        if (-not $body) {
            Write-Error "That .docx has no extractable text. Is it scanned images?"
            exit 1
        }
        Write-Output $body
        $count = ($body -split "`n").Count
        Write-Output ""
        Write-Output "===== $count paragraph(s) total ====="
        exit 0
    }

    # slide2.xml must not sort before slide10.xml, so order by the number, not the string.
    $slides = @(
        $zip.Entries |
            Where-Object { (Get-PartName $_) -match '^ppt/slides/slide\d+\.xml$' } |
            Sort-Object { [int][regex]::Match($_.FullName, '(\d+)\.xml$').Groups[1].Value }
    )
    if ($slides.Count -eq 0) {
        Write-Error "No slides found. Is $Path really a .pptx?"
        exit 1
    }

    foreach ($slide in $slides) {
        $n = [regex]::Match($slide.FullName, '(\d+)\.xml$').Groups[1].Value
        Write-Output "===== Slide $n ====="
        $body = Convert-PartToText $slide 'a:t' 'a:p'
        if ($body) { Write-Output $body } else { Write-Output "(no text - image-only slide)" }

        if (-not $NoNotes) {
            $notes = $zip.Entries |
                Where-Object { (Get-PartName $_) -eq "ppt/notesSlides/notesSlide$n.xml" }
            if ($notes) {
                $noteText = Convert-PartToText $notes[0] 'a:t' 'a:p'
                # PowerPoint stamps the slide number into the notes part; not content.
                $noteText = ($noteText -split "`n" | Where-Object { $_ -ne $n }) -join "`n"
                if ($noteText) {
                    Write-Output "--- Notes ---"
                    Write-Output $noteText
                }
            }
        }
        Write-Output ""
    }

    Write-Output "===== $($slides.Count) slide(s) total ====="
}
finally {
    $zip.Dispose()
}
