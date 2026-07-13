import { Button, Card } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { useLogout } from "@/features/auth/mutations";
import { useAuthStore } from "@/store";

export default function HomeScreen() {
  const { session } = useAuthStore();
  const logout = useLogout();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View>
          <Text className="text-2xl font-bold text-foreground">
            {session?.user.firstname
              ? `Hello, ${session.user.firstname} 👋`
              : "Hello 👋"}
          </Text>
          <Text className="text-muted mt-2">
            Your foundation is ready. Start building.
          </Text>
        </View>

        {/* Placeholder content card */}
        <Card>
          <Card.Header>
            <Card.Title>Getting started</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              Auth, tRPC, and TanStack Query are all wired up. Add your feature
              screens here.
            </Card.Description>
          </Card.Body>
        </Card>

        {/* Account card */}
        <Card variant="secondary">
          <Card.Header>
            <Card.Title>Account</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>{session?.user.email}</Card.Description>
          </Card.Body>
          <Card.Footer className="mt-4">
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              onPress={logout}
            >
              <Button.Label>Sign out</Button.Label>
            </Button>
          </Card.Footer>
        </Card>
      </ScrollView>
    </Screen>
  );
}
