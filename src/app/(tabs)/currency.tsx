import { StyleSheet, Text, View } from "react-native";

export default function CurrencyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Currency</Text>
      <Text>Your currency status will show up here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
});
