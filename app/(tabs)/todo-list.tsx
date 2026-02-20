import { styles } from "@/constants/styles";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import storage from "@/app/storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

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
  // # TODO: Use tab state to track active tab / content viewed
  const [tab, setTab] = useState<ToDoTab>("To Do");
  // temporarily storing item ids for timer
  const [ids, setIds] = useState<Record<string, boolean>>({});
  // storing timer for each item to handle timeouts
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // storing to do items
  const [items, setItems] = useState<ActionItem[]>([]);
  // loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // starts/resets timer for item id so item stays visible briefly before disappearing/moving
  const delayFor = (id: string, ms=700) => {
    // reset timer if there's already a timer for the item
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
    }
    // set ids for timer, marking id as delayed
    setIds(prev => ({...prev, [id]: true}));
    // after delay, remove id from delay set to be filtered/moved
    timers.current[id] = setTimeout(() => {
      setIds(prev => {
        const next = {...prev};
        delete next[id];
        return next;
      });
      // remove timer handle to clean up
      delete timers.current[id];
    }, ms);
  };

  // cleanup timers on unmountt
  useEffect(() => {
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, []);

  // toggle individual items' completed bool state and PATCH to update
  async function toggleCompleted(item: ActionItem) {
    // flip the completed bool
    const next = !item.completed;
    // track whether there are items on current tab that will move to another tab (have been checked)
    const itemsWillMove = (
      (tab === "To Do" && next === true) 
      || (tab === "Completed" && next === false)
    );
    // if items are about to move, start timer
    if (itemsWillMove) {
      delayFor(item.id, 700);
    }
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
      // keep unchecked items for a moment
      return items.filter(i => i.completed || ids[i.id]);
    }
    // else "To Do"
    // keep checked items for a moment
    return items.filter(i => !i.completed || ids[i.id]);
  }, [items, tab, ids]);

  // filtered items is empty
  const emptyFiltered = !loading && !error && filteredItems.length === 0;
  // all items empty
  const emptyAll = !loading && !error && items.length === 0;

  // redner list memoized so only rebuild when filtered items change
  const rendered = useMemo(() => {
    return filteredItems.map((item) => {
      // key for to do list
      const key = makeKey(item);
      // storing display data (checked boxes, deadline text)
      const isChecked = item.completed;
      const due = item.deadline ? `${item.deadline}` : "";

      return (
        <View style={{marginHorizontal: '3%'}}>
          <Pressable
            key={key}
            // user can tap anywhere on card to toggle complete, not just checkbox
            onPress={() => toggleCompleted(item)}
            style={{
              marginHorizontal: 12,
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(0,0,0,0.05)',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12
            }}
          >
            <Ionicons
              // checkbox icon when completed
              name={isChecked ? "checkbox-outline" : "square-outline"}
              size={36}
              color='black'
              style={{ marginTop: 4 }}
            />


            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flexDirection: 'column' }}>
              {/*action item text*/}
              <Text
                style={{
                  color: 'black',
                  fontWeight: '800',
                  fontSize: 16,
                  textDecorationLine: isChecked ? 'line-through' : 'none',
                  opacity: isChecked ? 0.5 : 1
                }}
              >
                {item.action_item}
              </Text>
              
              {/*optional due date*/}
              {!!due && (
                <Text style={{
                  color: 'rgba(0,0,0,0.7)',
                  marginTop: 4,
                  fontWeight: '700'
                }}>
                  Due by: {due}
                </Text>
              )}
              </View>

              <View style={{flexDirection:'row', justifyContent: 'flex-end', marginRight: 36}}>
                
                <Pressable
                  style={{
                    height: 36, 
                    width: 36, 
                    backgroundColor: '#9DB17C',
                    borderRadius: 12
                  }}
                  onPress={() => {}}
                >
                  <Ionicons
                    name={'pencil-outline'}
                    size={28}
                    color='black'
                    style={{
                      alignSelf: 'center', 
                      marginTop: 4
                    }}
                  />
                </Pressable>
                <Pressable
                  style={{
                    height: 36, 
                    width: 36, 
                    backgroundColor: '#8C311C',
                    borderRadius: 12
                  }}
                  onPress={() => {}}
                >
                  <Ionicons
                    name={'trash-bin-outline'}
                    size={28}
                    color='black'
                    style={{
                      alignSelf: 'center', 
                      marginTop: 4
                    }}
                  />
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      );
    });
  }, [filteredItems]);

  // filtered tab styles using bool flags
  const tabPill = (active: boolean) => ({ // actual tab pill
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 36,
    backgroundColor: active ? 'black' : 'rgba(0,0,0,0.05)',
    marginRight: 12,
    alignSelf: 'flex-start' as const,
    justifyContent: 'center' as const
  });
  const tabText = (active: boolean) => ({ // text in the tab pill
    fontWeight: '800' as const,
    fontSize: 16.67,
    color: active ? 'white' : 'rgba(0,0,0,0.75)'
  });

  return (
    <SafeAreaView style={[styles.dashSafe, {
      backgroundColor: '#F8F4F9'
    }]}>

      <View style={{
        paddingTop: '10%',
        paddingHorizontal: 24
      }}>

        <Text style={[styles.dashHeaderTitle, {
          color: '#000000'
        }]}>To-Do List</Text>

        <Text style={[styles.dashSectionTitle, {
          textAlign: 'left',
          marginTop: 12,
          fontSize: 16,
          fontWeight: '600',
          color: 'rgba(0,0,0,0.5)'
        }]}>
          Check off items as you complete them!
        </Text>

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
          <Text style={tabText(tab === "To Do")}>
            To Do
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("Completed")}
          style={tabPill(tab === "Completed")}
        >
          <Text style={tabText(tab === "Completed")}>
            Completed
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("All")}
          style={tabPill(tab === "All")}
        >
          <Text style={tabText(tab === "All")}>
            All Tasks
          </Text>
        </Pressable>
      </ScrollView>

      <View style={{ flex: 1, minHeight: 0 }}>

        {loading && (
          <View style={{
            paddingTop: 18,
            alignItems: 'center'
          }}>
            <ActivityIndicator color={'black'} />
            <Text style={{ color: 'black', marginTop: 12, fontWeight: '700' }}>
              Loading to-do list...
            </Text>
          </View>
        )}

        {!!error && !loading && (
          <Text style={{
            color: 'black',
            marginHorizontal: 16,
            marginTop: 16,
            fontWeight: '700'
          }}>
            {error}
          </Text>
        )}

        {emptyAll && (
          <View style={{
            alignItems: 'center',
            alignSelf: 'center',
            marginVertical: 24,
            backgroundColor: 'rgba(0,0,0,0.065)',
            maxWidth: '80%',
            borderRadius: 24
          }}>
            <Text style={{
              color: 'rgba(0,0,0,0.8)',
              marginHorizontal: 24,
              marginVertical: 12,
              fontWeight: '600',
              fontSize: 22
            }}>
              No to-do list items yet.
            </Text>
            <Text style={{
              color: 'rgba(0,0,0,0.5)',
              marginHorizontal: 36,
              marginVertical: 24,
              fontWeight: '500',
              fontSize: 18,
              textAlign: 'center',
              lineHeight: 28
            }}>
              Add to-do list items by taking images of real-world text like notices, bills, letters, and more!
            </Text>
          </View>
        )}

        {!emptyAll && emptyFiltered && (
          <View style={{
            alignItems: 'center',
            alignSelf: 'center',
            marginVertical: 24,
            backgroundColor: 'rgba(0,0,0,0.07)',
            maxWidth: '80%',
            borderRadius: 24
          }}>
            <Text style={{
              color: 'rgba(0,0,0,0.8)',
              marginHorizontal: 24,
              marginVertical: 12,
              fontWeight: '600',
              fontSize: 22
            }}>
              {tab === "Completed" ? "No completed items yet."
                : tab === "To Do" ? "No active to-do items." : "No items to show."}
            </Text>
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