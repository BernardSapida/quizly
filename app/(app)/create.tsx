import { useRouter } from "expo-router";
import { Button, Tabs } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import { Folder, Layers } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTabBarOverlap } from "@/components/ui/CustomTabBar";
import { repo } from "@/db";
import { COLORS, GLASS, SPACING } from "@/theme";

type Kind = "set" | "folder";

export default function CreateScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("set");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const tabBarOverlap = useTabBarOverlap();

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);

    if (kind === "folder") {
      const id = await repo.createFolder(name.trim());
      setName("");
      setSaving(false);
      router.push(`/folder/${id}`);
      return;
    }

    const id = await repo.createSet(name.trim());
    setName("");
    setSaving(false);
    // Straight into the editor — a set with no terms is useless.
    router.push(`/set/${id}/edit`);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: tabBarOverlap + SPACING.gutter,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Create"
          subtitle="A folder is a subject. A set is a lesson inside it."
          inset={false}
        />
        {/* Same full-width segmented control as Library: the List spans the row
            and each Trigger takes an equal share, so the indicator is a real half. */}
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <Tabs.List
            className="w-full flex-row rounded-full p-1"
            style={{
              backgroundColor: GLASS.fill,
              borderWidth: 1,
              borderColor: GLASS.border,
            }}
          >
            <Tabs.Indicator
              className="rounded-full"
              style={{ backgroundColor: COLORS.brand }}
            />
            <KindTrigger value="set" Icon={Layers} label="Set" />
            <KindTrigger value="folder" Icon={Folder} label="Folder" />
          </Tabs.List>
        </Tabs>

        <View className="gap-2">
          <Text className="text-app-muted text-xs font-semibold">
            {kind === "set" ? "SET NAME" : "FOLDER NAME"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={
              kind === "set" ? "Lesson 1: Introduction" : "English 101"
            }
            placeholderTextColor={COLORS.dark.muted}
            autoFocus
            onSubmitEditing={save}
            returnKeyType="done"
            className="rounded-2xl border border-app-glassline bg-app-glass px-4 py-4 text-app-text"
          />
        </View>

        <Button
          variant="primary"
          size="lg"
          isDisabled={!canSave}
          onPress={save}
        >
          <Button.Label>
            {kind === "set" ? "Create and add terms" : "Create folder"}
          </Button.Label>
        </Button>
      </ScrollView>
    </Screen>
  );
}

function KindTrigger({
  value,
  Icon,
  label,
}: {
  value: Kind;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <Tabs.Trigger value={value} className="flex-1 items-center py-2.5">
      {({ isSelected }) => {
        const color = isSelected ? "#FFFFFF" : COLORS.dark.muted;
        return (
          <View className="flex-row items-center gap-2">
            <Icon color={color} size={16} />
            <Tabs.Label className="text-sm font-bold" style={{ color }}>
              {label}
            </Tabs.Label>
          </View>
        );
      }}
    </Tabs.Trigger>
  );
}
