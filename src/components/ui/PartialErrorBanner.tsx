import { Pressable, Text, View } from 'react-native';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function PartialErrorBanner({ message, onRetry }: Props) {
  return (
    <View className="flex-row items-center gap-3 bg-warning-100 border border-warning-300 rounded-xl px-4 py-3 mx-4 mb-3">
      <Text className="text-warning-600 text-base">⚠️</Text>
      <Text className="flex-1 text-sm text-warning-700">{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry}>
          <Text className="text-sm font-semibold text-warning-700 underline">Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
