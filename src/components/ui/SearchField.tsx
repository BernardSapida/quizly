import { TextInput, View } from "react-native";
import { Search } from "lucide-react-native";

import { COLORS, GLASS } from "@/theme";

/**
 * The one search box in the app: a glass pill with the magnifier inside it. Home and
 * the Library both filter their own list with it, and they must look like the same
 * control doing the same thing in both places.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  className = "",
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 rounded-full px-4 py-3 ${className}`}
      style={{
        backgroundColor: GLASS.fill,
        borderWidth: 1,
        borderColor: GLASS.border,
      }}
    >
      <Search color={COLORS.dark.muted} size={18} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.dark.muted}
        className="flex-1 text-app-text"
        returnKeyType="search"
      />
    </View>
  );
}
