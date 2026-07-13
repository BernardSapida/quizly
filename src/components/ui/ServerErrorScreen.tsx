import { View, Text, StyleSheet } from "react-native";
import { Button } from "heroui-native";
import { AlertCircle } from "lucide-react-native";

interface Props {
  onRetry: () => void;
}

export function ServerErrorScreen({ onRetry }: Props) {
  return (
    <View className="bg-background" style={styles.container}>
      <AlertCircle size={64} color="#ef4444" />
      <Text className="text-foreground" style={styles.title}>
        Something Went Wrong
      </Text>
      <Text className="text-default-500" style={styles.description}>
        We're having trouble reaching our servers. Please try again.
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
