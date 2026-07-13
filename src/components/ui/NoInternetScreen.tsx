import { View, Text, StyleSheet } from "react-native";
import { Button } from "heroui-native";
import { WifiOff } from "lucide-react-native";

interface Props {
  onRetry: () => void;
}

export function NoInternetScreen({ onRetry }: Props) {
  return (
    <View className="bg-background" style={styles.container}>
      <WifiOff size={64} color="#a1a1aa" />
      <Text className="text-foreground" style={styles.title}>
        No Internet Connection
      </Text>
      <Text className="text-default-500" style={styles.description}>
        Check your connection and tap Retry to continue.
      </Text>
      <Button onPress={onRetry} className="mt-2">
        Retry
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
    zIndex: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
  },
});
