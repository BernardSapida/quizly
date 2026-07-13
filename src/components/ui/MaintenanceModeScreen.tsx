import { View, Text, StyleSheet } from "react-native";
import { Wrench } from "lucide-react-native";

interface Props {
  message: string | null;
}

export function MaintenanceModeScreen({ message }: Props) {
  return (
    <View className="bg-background" style={styles.container}>
      <Wrench size={64} color="#f59e0b" />
      <Text className="text-foreground" style={styles.title}>
        Under Maintenance
      </Text>
      <Text className="text-default-500" style={styles.description}>
        {message ?? "We're making improvements. Please check back soon."}
      </Text>
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
