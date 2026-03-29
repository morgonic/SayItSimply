import { useTheme } from "@/app/context/ThemeContext";
import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import { styles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
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

const formatYdmToDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

const formatDateToYdm = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

      // modal
      modalOverlay: isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.45)",
      modalCardBg: isDark ? "#2B2B2B" : "#FFFFFF",
      modalInputBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)",
      modalPlaceholder: isDark ? "rgba(229,231,235,0.50)" : "rgba(0,0,0,0.40)",
      modalSecondaryBg: isDark ? "#111111" : "#E5E7EB",
      modalDatePickerBg: isDark ? "#2B2B2B" : "#FFFFFF",

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
  // temporarily storing item ids for timer
  const [ids, setIds] = useState<Record<string, boolean>>({});
  // storing timer for each item to handle timeouts
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // storing to do items
  const [items, setItems] = useState<ActionItem[]>([]);
  // loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // state for to do item being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // edit item modal states
  const [editVisible, setEditVisible] = useState(false);
  const [editItem, setEditItem] = useState<ActionItem | null>(null);
  const [editText, setEditText] = useState("");
  const [editDeadlineDate, setEditDeadlineDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editCompleted, setEditCompleted] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  // new custom item modal states
  const [newVisible, setNewVisible] = useState(false);
  const [newText, setNewText] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState<Date | null>(null);
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  // platform being used
  const platform = Platform.OS;
  // custom toast states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // custom toast function
  const showToast = (message: string, ms=1600) => {
    // set the toast message to show
    setToastMessage(message);
    // clear existing timers
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    // set timer to clear after # of ms
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
      toastTimer.current = null;
    }, ms);
  };

  // use effect cleanup for toast timer
  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    }
  }, []);

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

  // delete to do item
  const deleteToDoItem = async (itemId: string) => {
    // no api url, throw error
    if (!api_url) {
      throw new Error("EXPO_PUBLIC_API_URL not set");
    }
    // set the item's id as the one being deleted
    setDeletingId(itemId);

    try{
      // get token adn token type
      const token = await storage.getItem("access_token");
      const tokenType = await storage.getItem("token_type");
      // make api call to delete
      const response = await fetch(`${api_url}/users/me/todo/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `${tokenType} ${token}`,
          Accept: 'application/json'
        }
      });
      // bad response, throw error
      if (!response.ok) {
        throw new Error(`Delete To Do Item failed: ${response.status}`);
      }
      // update to-do list to not include deleted item by id
      setItems((prev) => 
        prev.filter((i) => 
          i.id !== itemId
        )
      );
    }
    catch (e: any) {
      console.warn("Failed to delete to-do item:", e);
      Alert.alert("Delete To-Do Item Failed:", e?.message ?? "Could not delete item. Please try again.");
    }
    finally {
      // finally, delete that item
      setDeletingId((prev) => 
        (prev === itemId ? null : prev)
      );
    }
  };

  // use alert as deletion confirmation modal
  const confirmDeleteTodoItem = (itemId: string) => {
    Alert.alert(
      "Delete To-Do List item?",
      "WARNING: This can NOT be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteToDoItem(itemId)}
      ],
      { cancelable: true }
    );
  };

  const openEditModal = (item: ActionItem) => {
    setEditItem(item);
    setEditText(item.action_item ?? "");
    setEditDeadlineDate(item.deadline ? formatYdmToDate(item.deadline) : null);
    setShowDatePicker(false);
    setEditCompleted(item.completed ?? false);
    setEditVisible(true);
  };

  const closeEditModal = () => {
    setEditVisible(false);
    setEditItem(null);
    setEditText("");
    setEditDeadlineDate(null);
    setEditCompleted(false);
    setShowDatePicker(false);
  };

  const openNewModal = () => {
    setNewText("");
    setNewDeadlineDate(null);
    setShowNewDatePicker(false);
    setNewVisible(true);
  };

  const closeNewModal = () => {
    setNewVisible(false);
    setNewText("");
    setNewDeadlineDate(null);
    setShowNewDatePicker(false);
  };

  const saveEdit = async () => {
    if (!editItem) {
      return;
    }

    const newEditText = editText.trim();
    const newEditDeadline = editDeadlineDate ? formatDateToYdm(editDeadlineDate) : null;
    const newDeadline = newEditDeadline;

    if (!newEditText) {
      Alert.alert("Missing action item text.", "Action item text cannot be empty.");
      return;
    }

    const patch: any = {};

    if (newEditText !== editItem.action_item) {
      patch.action_item = newEditText;
    }

    if ((newDeadline ?? null) !== (editItem.deadline ?? null)) {
      patch.deadline = newDeadline;
    }

    if (editCompleted !== editItem.completed) {
      patch.completed = editCompleted;
    }

    if (Object.keys(patch).length === 0) {
      closeEditModal();
      return;
    }

    if ("completed" in patch) {
      const itemsWillMove = (
        (tab === "To Do" && editCompleted === true) 
        || (tab === "Completed" && editCompleted === false)
      );

      if (itemsWillMove) {
        delayFor(editItem.id, 700);
      }
    }

    try {
      setSavingEdit(true); 

      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type") ?? "bearer");

      if (!api_url) {
        throw new Error("Missing EXPO_PUBLIC_API_URL");
      }

      if (!token) {
        throw new Error("Missing auth/access token");
      }

      const response = await fetch(`${api_url}/users/me/todo/${editItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${tokenType} ${token}`
        },
        body: JSON.stringify(patch)
      });

      const bodyText = await response.text();

      if (!response.ok) {
        throw new Error(bodyText || `PATCH failed: ${response.status}`);
      }

      const updated: ActionItem = JSON.parse(bodyText);

      setItems((prev) => 
        prev.map((i) => 
          (i.id === updated.id ? updated : i)
        )
      );

      closeEditModal();
    }
    catch (e: any) {
      console.warn("Failed to edit to-do item:", e);
      Alert.alert("Edit To-Do Item failed:", e?.message ?? "Could not update item.");
    }
    finally {
      setSavingEdit(false);
    }
  };

  const saveNew = async () => {
    const trimmedText = newText.trim();

    if (!trimmedText) {
      Alert.alert("Missing action item text.", "Action item text cannot be empty.");
      return;
    }

    try{
      setSavingNew(true);

      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type") ?? "bearer");

      if (!api_url) {
        throw new Error("Missing EXPO_PUBLIC_API_URL");
      }

      if (!token) {
        throw new Error("Missing auth/access token");
      }

      const payload = {
        action_items: [
          {
            action_item: trimmedText,
            deadline: newDeadlineDate ? formatDateToYdm(newDeadlineDate) : null,
            completed: false
          }
        ]
      };

      const response = await fetch(`${api_url}/users/me/todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${tokenType} ${token}`
        },
        body: JSON.stringify(payload)
      });

      const bodyText = await response.text();

      if (!response.ok) {
        throw new Error(bodyText || `POST failed: ${response.status}`);
      }

      await fetchToDoList();
      closeNewModal();
    }
    catch (e: any) {
      console.warn("Failed to create custom to-do item:", e);
      Alert.alert("Create Custom To-Do Item Failed:", e?.message ?? "Could not create new item.");
    }
    finally {
      setSavingNew(false);
    }
  };

  const clearAllToDoItems = async () => {

    if (!api_url) {
      Alert.alert("Configuration Error", "Missing EXPO_PUBLIC_API_URL environment variable. Cannot clear To-Do List.");
      console.warn("MISSING EXPO_PUBLIC_API_URL");
      return;
    }

    try{
      // start loading at beginning of process
      setLoading(true);

      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type") ?? "bearer");

      if (!token) {
        throw new Error("Missing auth/access token");
      }

      // delete one by one
      for (const item of items) {
        const response = await fetch(`${api_url}/users/me/todo/${item.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `${tokenType} ${token}`,
            Accept: 'application/json'
          }
        });

        const bodyText = await response.text();

        if (!response.ok) {
          throw new Error(bodyText || `Failed to delete item ${item.id}: ${response.status}`);
        }
      }
      // empty list
      setItems([]);
      // refetch list just in case setItems does not update UI
      await fetchToDoList();
    }
    catch (e: any) {
      console.warn("Clear All To-Do Items Failed:", e);
      Alert.alert("Clear All To-Do Items Failed:", e?.message ?? "Could not clear To-Do List. Please try again.");
      // refresh list
      fetchToDoList();
    }
    finally {
      // stop loading
      setLoading(false);
    }
  }

  const confirmClearAll = () => {
    // show custom toast message and return if already cleared
    if (items.length === 0) {
      showToast("No items to clear.");
      return;
    }
    // user confirms or cancels using alert
    Alert.alert(
      "Clear all To-Do List items?",
      "WARNING: This will permanently delete ALL items. This CANNOT be undone.",
      [
        {text: 'Cancel', style: 'cancel'},
        // clear all button clears all to-do items onpress using async fucntion
        {text: 'Clear All', style: 'destructive', onPress: clearAllToDoItems}
      ],
      {cancelable: true}
    )
  }

  // render list memoized so only rebuild when filtered items change
  const rendered = useMemo(() => {
    return filteredItems.map((item) => {
      // key for to do list
      const key = makeKey(item);
      // storing display data (checked boxes, deadline text)
      const isChecked = item.completed;
      const due = item.deadline ? `${item.deadline}` : "";

      return (
        <View key={key} style={{marginHorizontal: '3%'}}>
          <Pressable
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


            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
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
                  color: C.subtitle,
                  marginTop: 4,
                  fontWeight: '700'
                }}>
                  Due by: {due}
                </AppText>
              )}
              </View>

              <View style={{flexDirection:'row', marginLeft: 'auto', gap: 8}}>
                
                <Pressable
                  style={{
                    height: 42, 
                    width: 42, 
                    backgroundColor: '#9DB17C',
                    borderRadius: 12
                  }}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    openEditModal(item);
                  }}
                >
                  <Ionicons
                    name={'pencil-sharp'}
                    size={28}
                    color='black'
                    style={{
                      alignSelf: 'center',
                      margin: 'auto'
                    }}
                  />
                </Pressable>
                <Pressable
                  style={{
                    height: 42, 
                    width: 42, 
                    backgroundColor: '#8C311C',
                    borderRadius: 12
                  }}
                  disabled={deletingId === item.id}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    confirmDeleteTodoItem(item.id);
                  }}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator style={{marginTop: 8}}/>
                  ) : (
                    <Ionicons
                    name={'trash-bin-sharp'}
                    size={28}
                    color='white'
                    style={{
                      alignSelf: 'center', 
                      margin: 'auto'
                    }}
                    />
                  )}
                  
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

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 48,
        paddingVertical: 12
      }}>
        <Pressable
          onPress={confirmClearAll}
          style={{flexDirection: 'row', alignItems: 'center', gap: 8}}
        >
          <Ionicons name='close' size={22} color={C.text}/>
          <AppText style={{
            color: C.text,
            fontWeight: '700',
            fontSize: 22
          }}>
            Clear
          </AppText>

        </Pressable>

        <Pressable
          onPress={openNewModal}
          style={{flexDirection: 'row', alignItems: 'center', gap: 8}}
        >
          <Ionicons name='add' size={22} color={C.text}/>
          <AppText style={{
            color: C.text,
            fontWeight: '700',
            fontSize: 22
          }}>
            New
          </AppText>

        </Pressable>
      </View>

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
              No to-do list items.
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
              {tab === "Completed" ? "No completed items."
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

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable
          onPress={closeEditModal}
          style={{
            flex: 1,
            backgroundColor: C.modalOverlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18
          }}
        >
          <Pressable
            onPress={(event) => event?.stopPropagation?.()}
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: C.modalCardBg,
              borderRadius: 24,
              padding: 16
            }}
          >
            <AppText style={{fontSize: 18, fontWeight: '800', color: C.title}}>
              Edit Item
            </AppText>

            <View style={{height: 12}}/>

            <AppText style={{fontSize: 16, fontWeight: '700', color: C.title}}>
              Task
            </AppText>

            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="Action Item"
              placeholderTextColor={C.text}
              style={{
                marginTop: 8,
                backgroundColor: C.modalInputBg,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: C.text,
                fontWeight: '700'
              }}
            />

            <View style={{height: 12}}/>

            <AppText style={{fontSize: 16, fontWeight: '700', color: C.title}}>
              Deadline{" "}
              <AppText style={{fontWeight: '600', color: C.subtitle}}>(optional)</AppText>
            </AppText>

            <View style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12
            }}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  flex: 1,
                  backgroundColor: C.modalInputBg,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12
                }}
              >
                <AppText style={{fontWeight: '700', color: C.text}}>
                  {editDeadlineDate ? formatDateToYdm(editDeadlineDate) : "No deadline"}
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setEditDeadlineDate(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: C.modalSecondaryBg
                }}
              >
                <AppText style={{fontWeight: '800', color: C.text}}>
                  Clear
                </AppText>
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={editDeadlineDate ?? new Date()}
                mode='date'
                display={platform === 'ios' ? 'spinner' : 'default'}
                onChange={(_event: any, selected: Date | undefined) => {
                  if (platform === 'android') {
                    setShowDatePicker(false);
                  }
                  if (!selected) {
                    return;
                  }
                  setEditDeadlineDate(selected);
                }}
                style={{alignSelf: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: C.modalDatePickerBg, borderRadius: 24}}
              />
            )}
            
            <View style={{
              marginTop: 14, 
              flexDirection: 'row', 
              alignItems: 'center'
            }}>
              <AppText style={{fontSize: 16, fontWeight: '700', marginRight: 12, color: C.title}}>
                Completed
              </AppText>
              <Switch 
                value={editCompleted} 
                onValueChange={setEditCompleted}
                trackColor={{false: '#8C311C', true: '#9DB17C'}}
                thumbColor={'white'}
                ios_backgroundColor={'#8C311C'}
              />
            </View>

            <View style={{
              marginTop: 16,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 10
            }}>
              <Pressable
                onPress={closeEditModal}
                disabled={savingEdit}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#8C311C',
                  opacity: savingEdit ? 0.6 : 1
                }}
              >
                <AppText style={{fontSize: 14, fontWeight: '700', color: 'white'}}>
                  Cancel
                </AppText>
              </Pressable>

              <Pressable
                onPress={saveEdit}
                disabled={savingEdit}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: '#9DB17C',
                  opacity: savingEdit ? 0.6 : 1,
                  minWidth: 90,
                  alignItems: 'center'
                }}
              >
                {savingEdit ? (
                  <ActivityIndicator color='black'/>
                ) : (
                  <AppText style={{fontSize: 14, fontWeight: '700', color: 'black'}}>
                    Save
                  </AppText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={newVisible}
        transparent
        animationType='fade'
        onRequestClose={closeNewModal}
      >
        <Pressable
          onPress={closeNewModal}
          style={{
            flex: 1,
            backgroundColor: C.modalOverlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 18
          }}
        >
          <Pressable
            onPress={(event) => event?.stopPropagation?.()}
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: C.modalCardBg,
              borderRadius: 24,
              padding: 12
            }}
          >
            <AppText style={{ fontSize: 18, fontWeight: '800', color: C.title}}>
              New To-Do Item
            </AppText>

            <View style={{height: 12}}/>

            <AppText style={{fontSize: 16, fontWeight: '700', color: C.title}}>
              Task
            </AppText>

            <TextInput
              value={newText}
              onChangeText={setNewText}
              placeholder='Action Item'
              placeholderTextColor={C.text}
              style={{
                marginTop: 12,
                backgroundColor: C.modalInputBg,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: C.text,
                fontWeight: '700'
              }}
            />

            <View style={{height: 12}}/>

            <AppText style={{fontSize: 16, fontWeight: '700', color: C.title}}>
              Deadline{" "}
              <AppText style={{fontWeight: '600', color: C.subtitle}}>(optional)</AppText>
            </AppText>

            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12
              }}
            >
              <Pressable
                onPress={() => setShowNewDatePicker(true)}
                style={{
                  flex: 1,
                  backgroundColor: C.modalInputBg,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12
                }}
              >
                <AppText style={{fontWeight: '700', color: C.text}}>
                  {newDeadlineDate ? formatDateToYdm(newDeadlineDate) : "No deadline"}
                </AppText>
              </Pressable>

              <Pressable  
                onPress={() => setNewDeadlineDate(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: C.modalSecondaryBg
                }}
              >
                <AppText style={{fontWeight: '800', color: C.text}}>
                  Clear
                </AppText>
              </Pressable>
            </View>

            {showNewDatePicker && (
              <DateTimePicker
                value={newDeadlineDate ?? new Date()}
                mode='date'
                display={platform === 'ios' ? 'spinner' : 'default'}
                onChange={(_event: any, selected: Date | undefined) => {
                  if (platform === 'android') {
                    setShowNewDatePicker(false);
                  }

                  if (!selected) {
                    return;
                  }

                  setNewDeadlineDate(selected);
                }}
                style={{alignSelf: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: C.modalDatePickerBg, borderRadius: 24}}
              />
            )}

            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 10
              }}
            >
              <Pressable
                onPress={closeNewModal}
                disabled={savingNew}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#8C311C',
                  opacity: savingNew ? 0.6 : 1
                }}
              >
                <AppText style={{fontSize: 14, fontWeight: '700', color: 'white'}}>
                  Cancel
                </AppText>
              </Pressable>

              <Pressable
                onPress={saveNew}
                disabled={savingNew}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#9DB17C',
                  opacity: savingNew ? 0.6 : 1,
                  minWidth: 90,
                  alignItems: 'center'
                }}
              >
                {savingNew ? (
                  <ActivityIndicator color='black'/>
                ) : (
                  <AppText style={{fontSize: 14, fontWeight: '700', color: 'black'}}>
                    Add
                  </AppText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {toastMessage && (
        <View
          style={{
            position: 'absolute',
            left: 48,
            right: 48,
            bottom: 24,
            paddingVertical: 12,
            paddingHorizontal: 18,
            backgroundColor: C.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            alignItems: 'center',
            borderRadius: 12
          }}
          pointerEvents="none"
        >
          <AppText style={{color: C.isDark ? C.text : 'white', fontWeight: '700'}}>
            {toastMessage}
          </AppText>
        </View>
      )}

    </SafeAreaView>
  );
}
