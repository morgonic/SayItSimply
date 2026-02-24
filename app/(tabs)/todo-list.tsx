import { useTheme } from "@/app/context/ThemeContext";
import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import { styles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// action item data structure matching db
type ActionItem = {
  id: string;
  action_item: string;
  deadline?: string | null;
  completed: boolean;
};
// #TODO: Add filtering using tabs
type ToDoTab = "To Do" | "Completed" | "All"
// ngrok public api url
const api_url = process.env.EXPO_PUBLIC_API_URL;

export default function toDoListScreen() {
  const { darkMode } = useTheme();

  const C = useMemo(() => {
    const isDark = !!darkMode;
    return {
      isDark,
      bg: isDark ? "#0B1220" : "#F8F4F9",

      title: isDark ? "#E5E7EB" : "#000000",
      subtitle: isDark ? "rgba(229,231,235,0.65)" : "rgba(0,0,0,0.5)",

      // pills
      tabActiveBg: isDark ? "#E9C6A6" : "#000000",
      tabActiveText: isDark ? "#111827" : "#FFFFFF",
      tabInactiveBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      tabInactiveText: isDark ? "rgba(229,231,235,0.80)" : "rgba(0,0,0,0.75)",

      // list cards
      cardBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      cardBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",

      text: isDark ? "#E5E7EB" : "#000000",
      due: isDark ? "rgba(229,231,235,0.70)" : "rgba(0,0,0,0.7)",

      icon: isDark ? "#E5E7EB" : "black",
      iconChecked: isDark ? "#E9C6A6" : "black",

      // empty states
      emptyCardBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.065)",
      emptyTitle: isDark ? "rgba(229,231,235,0.90)" : "rgba(0,0,0,0.8)",
      emptyBody: isDark ? "rgba(229,231,235,0.65)" : "rgba(0,0,0,0.5)",

      // loading
      spinner: isDark ? "#E5E7EB" : "black",
    };
  }, [darkMode]);

  // # TODO: Use tab state to track active tab / content viewed
  const [tab, setTab] = useState<ToDoTab>("To Do");
  // storing to do items
  const [items, setItems] = useState<ActionItem[]>([]);
  // loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // toggle individual items' completed bool state
  async function toggleCompleted(item: ActionItem) {
    // flip the completed bool
    const next = !item.completed;
    // update completed items in useState
    setItems(prev =>
      // iterate items
      prev.map(it => (
        // find id match
        it.id === item.id ? {
          // keep other data same
          ...it,
          // only change completed to flipped value
          completed: next
        } : it // no id match, stay same
      ))
    );
    // patch todo list
    try {
      // get access token and type
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer"
      // api url and token are required. if none, throw error message
      if (!api_url) {
        throw new Error("Missing ngrok API URL")
      }
      if (!token) {
        throw new Error("Missing auth/access token")
      }
      // fetch todo patch endpoint by item id to update in db
      const response = await fetch(`${api_url}/users/me/todo/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${tokenType} ${token}`
        },
        body: JSON.stringify({ completed: next }) // patch item's completed bool
      });
      // read body text from json response
      const bodyText = await response.text();
      console.log("PATCH status:", response.status);
      console.log("PATCH body:", bodyText);
      // bad response, error text
      if (!response.ok) {
        throw new Error(bodyText || "PATCH failed");
      }
    }
    catch (e) {
      // api call fails, set items using input parameter ActionItem
      // setting local state
      setItems(prev =>
        prev.map(i => (
          i.id === item.id ? {
            ...i,
            completed: item.completed
          } : i))
      );
      // log the warning
      console.warn("Failed to update action_item.completed:", e);
    }

  }
  // make action item key for rendering the to do list
  const makeKey = (it: ActionItem) => it.id;
  // async callback to fetch full to do list (get)
  const fetchToDoList = useCallback(async () => {

    try {
      // set loading and error states
      setLoading(true);
      setError(null);
      // api url required, throw error if missing
      if (!api_url) {
        throw new Error("Missing EXPO_PUBLIC_API_URL");
      }
      // get access token and type
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";
      // get to do list
      const response = await fetch(`${api_url}/users/me/todo`, {
        headers: {
          Authorization: `${tokenType} ${token}`
        }
      });
      // bad response, throw error text or status code
      if (!response.ok) {
        const text = await response.text();

        throw new Error(text || `Failed to load To-Do List: ${response.status}`);
      }
      // get response json as list of ActionItems
      const todoItems: ActionItem[] = await response.json();
      setItems(todoItems);
    }
    catch (e: any) {
      // set error state/message
      setError(e?.message ?? "Failed to load To-Do List");
      // set empty list
      setItems([]);
    }
    finally {
      // quit loading
      setLoading(false);
    }
  }, []);

  // load this initially on mount
  useEffect(() => {
    fetchToDoList();
  }, [fetchToDoList]);
  // refresh when navigating back to screen
  useFocusEffect(
    useCallback(() => {
      fetchToDoList();
    }, [fetchToDoList])
  );

  // CONSOLE LOGS FOR DEVELOPMENT/DEBUGGING PURPOSES
  useEffect(() => {
    const ids = items.map(i => i.id);
    const dupes = ids.filter((id, index) =>
      ids.indexOf(id) !== index
    )

    if (dupes.length) {
      console.warn("To-Do List items with duplicate IDs:", dupes);
    }
    if (ids.some(id => !id)) {
      console.warn("Missing IDs in to_do list items")
    }
  }, [items]); // logs when items state is updated

  // filter items by active tab
  const filteredItems = useMemo(() => {
    if (tab === "All") {
      return items;
    }
    if (tab === "Completed") {
      return items.filter(i => i.completed);
    }
    // else "To Do"
    return items.filter(i => !i.completed);
  }, [items, tab]);

  // filtered items is empty
  const emptyFiltered = !loading && !error && filteredItems.length === 0;
  // all items empty
  const emptyAll = !loading && !error && items.length === 0;

  // render list memoized so only rebuild when filtered items change
  const rendered = useMemo(() => {
    return filteredItems.map((item) => {
      // key for to do list
      const key = makeKey(item);
      // storing display data (checked boxes, deadline text)
      const isChecked = item.completed;
      const due = item.deadline ? `${item.deadline}` : "";

      return (
        <Pressable
          key={key}
          // user can tap anywhere on card to toggle complete, not just checkbox
          onPress={() => toggleCompleted(item)}
          style={{
            marginHorizontal: 12,
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            borderColor: C.cardBorder,
            backgroundColor: C.cardBg,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12
          }}
        >
          <Ionicons
            // checkbox icon when completed
            name={isChecked ? "checkbox-outline" : "square-outline"}
            size={36}
            color={isChecked ? C.iconChecked : C.icon}
            style={{ marginTop: 4 }}
          />


          <View style={{ flex: 1 }}>
            {/*action item text*/}
            <AppText
              style={{
                color: C.text,
                fontWeight: '800',
                fontSize: 16,
                textDecorationLine: isChecked ? 'line-through' : 'none',
                opacity: isChecked ? 0.5 : 1
              }}
            >
              {item.action_item}
            </AppText>
            {/*optional due date*/}
            {!!due && (
              <AppText style={{
                color: C.due,
                marginTop: 4,
                fontWeight: '700'
              }}>
                Due by: {due}
              </AppText>
            )}
          </View>
        </Pressable>
      );
    });
  }, [filteredItems]);

  // filtered tab styles using bool flags
  const tabPill = (active: boolean) => ({ // actual tab pill
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 36,
    borderWidth: C.isDark ? 1 : 0,
    borderColor: C.isDark ? "rgba(255,255,255,0.10)" : "transparent",
    backgroundColor: active ? C.tabActiveBg : C.tabInactiveBg,
    marginRight: 12,
    alignSelf: 'flex-start' as const,
    justifyContent: 'center' as const
  });
  const tabText = (active: boolean) => ({ // text in the tab pill
    fontWeight: '800' as const,
    fontSize: 16.67,
    color: active ? C.tabActiveText : C.tabInactiveText
  });

  return (
    <SafeAreaView style={[styles.dashSafe, {
      backgroundColor: C.bg
    }]}>

      <View style={{
        paddingTop: '10%',
        paddingHorizontal: 24
      }}>

        <AppText style={[styles.dashHeaderTitle, {
          color: C.title
        }]}>To-Do List</AppText>

        <AppText style={[styles.dashSectionTitle, {
          textAlign: 'left',
          marginTop: 12,
          fontSize: 16,
          fontWeight: '600',
          color: C.subtitle
        }]}>
          Check off items as you complete them!
        </AppText>

      </View>

      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        style={{
          flexGrow: 0,
          maxHeight: 64
        }}
        contentContainerStyle={{
          paddingHorizontal: 36,
          paddingBottom: 12,
          alignItems: 'center'
        }}
      >
        <Pressable
          onPress={() => setTab("To Do")}
          style={tabPill(tab === "To Do")}
        >
          <AppText style={tabText(tab === "To Do")}>
            To Do
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setTab("Completed")}
          style={tabPill(tab === "Completed")}
        >
          <AppText style={tabText(tab === "Completed")}>
            Completed
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setTab("All")}
          style={tabPill(tab === "All")}
        >
          <AppText style={tabText(tab === "All")}>
            All Tasks
          </AppText>
        </Pressable>
      </ScrollView>

      <View style={{ flex: 1, minHeight: 0 }}>

        {loading && (
          <View style={{
            paddingTop: 18,
            alignItems: 'center'
          }}>
            <ActivityIndicator color={C.spinner} />
            <AppText style={{ color: C.text, marginTop: 12, fontWeight: '700' }}>
              Loading to-do list...
            </AppText>
          </View>
        )}

        {!!error && !loading && (
          <AppText style={{
            color: C.text,
            marginHorizontal: 16,
            marginTop: 16,
            fontWeight: '700'
          }}>
            {error}
          </AppText>
        )}

        {emptyAll && (
          <View style={{
            alignItems: 'center',
            alignSelf: 'center',
            marginVertical: 24,
            backgroundColor: C.emptyCardBg,
            maxWidth: '80%',
            borderRadius: 24
          }}>
            <AppText style={{
              color: C.emptyTitle,
              marginHorizontal: 24,
              marginVertical: 12,
              fontWeight: '600',
              fontSize: 22
            }}>
              No to-do list items yet.
            </AppText>
            <AppText style={{
              color: C.emptyBody,
              marginHorizontal: 36,
              marginVertical: 24,
              fontWeight: '500',
              fontSize: 18,
              textAlign: 'center',
              lineHeight: 28
            }}>
              Add to-do list items by taking images of real-world text like notices, bills, letters, and more!
            </AppText>
          </View>
        )}

        {!emptyAll && emptyFiltered && (
          <View style={{
            alignItems: 'center',
            alignSelf: 'center',
            marginVertical: 24,
            backgroundColor: C.emptyCardBg,
            maxWidth: '80%',
            borderRadius: 24
          }}>
            <AppText style={{
              color: C.emptyTitle,
              marginHorizontal: 24,
              marginVertical: 12,
              fontWeight: '600',
              fontSize: 22
            }}>
              {tab === "Completed" ? "No completed items yet."
                : tab === "To Do" ? "No active to-do items." : "No items to show."}
            </AppText>
          </View>
        )}

        <ScrollView
          style={{
            flex: 1
          }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 24,
            justifyContent: 'flex-start'
          }}
        >
          {/*list of action items from to_do in user table db*/}
          {rendered}
        </ScrollView>
      </View>

    </SafeAreaView>
  );
}