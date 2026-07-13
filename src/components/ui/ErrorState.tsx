import { Pressable, Text, View } from 'react-native';

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again.',
  onRetry,
}: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 py-12">
      <View className="w-16 h-16 rounded-full bg-danger-100 items-center justify-center">
        <Text className="text-3xl">⚠️</Text>
      </View>
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground text-center">{title}</Text>
        <Text className="text-sm text-default-500 text-center">{description}</Text>
      </View>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="mt-2 bg-accent rounded-xl px-6 py-3"
        >
          <Text className="text-accent-foreground font-semibold text-sm">Try again</Text>
        </Pressable>
      )}
    </View>
  );
}
