import { Input } from "heroui-native";
import { useThemeColor } from "heroui-native";
import { Eye, EyeOff } from "lucide-react-native";
import { ComponentProps, useState } from "react";
import { Pressable, View } from "react-native";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "secureTextEntry">;

export function PasswordInput(props: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const muted = useThemeColor("muted");

  return (
    <View className="relative w-full">
      <Input {...props} secureTextEntry={!show} className="pr-10" />
      <Pressable
        onPress={() => setShow((v) => !v)}
        className="absolute right-3 top-0 bottom-0 justify-center"
        hitSlop={8}
      >
        {show ? (
          <EyeOff size={18} color={muted} />
        ) : (
          <Eye size={18} color={muted} />
        )}
      </Pressable>
    </View>
  );
}
