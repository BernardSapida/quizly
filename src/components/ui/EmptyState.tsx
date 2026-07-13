import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, ctaLabel, onCta, icon }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 py-12">
      {icon && <View>{icon}</View>}
      <View className="items-center gap-2">
        <Text className="text-lg font-semibold text-foreground text-center">{title}</Text>
        {description && (
          <Text className="text-sm text-default-500 text-center">{description}</Text>
        )}
      </View>
      {ctaLabel && onCta && (
        <Pressable
          onPress={onCta}
          className="mt-2 bg-accent rounded-xl px-6 py-3"
        >
          <Text className="text-accent-foreground font-semibold text-sm">{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
