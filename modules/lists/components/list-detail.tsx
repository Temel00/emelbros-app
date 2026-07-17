"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { moveItem } from "@/lib/reorder";
import { getListKind } from "@/modules/lists/kinds";
import {
  addItemAction,
  clearCheckedAction,
  deleteItemAction,
  reorderItemsAction,
  toggleItemCheckedAction,
  uncheckAllAction,
  updateItemTextAction,
} from "@/modules/lists/actions";
import { ListSettingsDialog } from "@/modules/lists/components/list-settings-dialog";

import type {
  ItemRow,
  ListRow,
  ParticipantRow,
  ProfileRow,
} from "@/modules/lists/queries";

/**
 * The lists module's detail view (lists.md §3): item add/edit/check/reorder/
 * delete plus the Uncheck-all / Clear-checked bulk actions, open to anyone
 * who can see the list (RLS backs every write here). Settings — rename,
 * scope, participants, archive, delete — are owner-only and gated to the
 * settings dialog rather than duplicated here.
 */
export function ListDetail({
  list,
  items,
  participants,
  candidates,
  isOwner,
}: {
  list: ListRow;
  items: ItemRow[];
  participants: ParticipantRow[];
  candidates: ProfileRow[];
  isOwner: boolean;
}) {
  const kind = getListKind(list.kind);

  const [itemOrder, setItemOrder] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setItemOrder(items);
  }

  const [newItemText, setNewItemText] = useState("");
  const [, startTransition] = useTransition();

  const activeItems = itemOrder.filter((item) => !item.checked);
  const checkedItems = itemOrder.filter((item) => item.checked);

  function handleAddItem(event: React.FormEvent) {
    event.preventDefault();
    const text = newItemText;
    if (text.trim().length === 0) return;

    setNewItemText("");
    startTransition(async () => {
      await addItemAction(list.id, text);
    });
  }

  function handleToggleChecked(item: ItemRow) {
    const checked = !item.checked;
    setItemOrder((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked } : i)),
    );
    startTransition(async () => {
      await toggleItemCheckedAction(list.id, item.id, checked);
    });
  }

  function handleTextSave(item: ItemRow, text: string) {
    if (text.trim().length === 0 || text.trim() === item.text) return;
    startTransition(async () => {
      await updateItemTextAction(list.id, item.id, text);
    });
  }

  function handleDelete(item: ItemRow) {
    setItemOrder((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(async () => {
      await deleteItemAction(list.id, item.id);
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const nextActive = moveItem(activeItems, index, direction);
    setItemOrder([...nextActive, ...checkedItems]);
    startTransition(async () => {
      await reorderItemsAction(
        list.id,
        nextActive.map((item) => item.id),
      );
    });
  }

  function handleUncheckAll() {
    setItemOrder((prev) => prev.map((item) => ({ ...item, checked: false })));
    startTransition(async () => {
      await uncheckAllAction(list.id);
    });
  }

  function handleClearChecked() {
    if (!window.confirm("Delete every checked item? This can't be undone.")) {
      return;
    }
    setItemOrder((prev) => prev.filter((item) => !item.checked));
    startTransition(async () => {
      await clearCheckedAction(list.id);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{list.title}</h1>
          <p className="text-xs text-muted-foreground">{kind.label}</p>
        </div>
        {isOwner && (
          <ListSettingsDialog
            list={list}
            participants={participants}
            candidates={candidates}
          />
        )}
      </div>

      <form onSubmit={handleAddItem} className="flex gap-2">
        <Input
          value={newItemText}
          onChange={(event) => setNewItemText(event.target.value)}
          placeholder="Add an item"
          aria-label="Add an item"
        />
        <Button type="submit" size="icon" aria-label="Add item">
          <Plus />
        </Button>
      </form>

      {itemOrder.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No items yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {activeItems.map((item, index) => (
            <ItemLine
              key={item.id}
              item={item}
              checkable={kind.checkable}
              canMoveUp={index > 0}
              canMoveDown={index < activeItems.length - 1}
              onMoveUp={() => handleMove(index, "up")}
              onMoveDown={() => handleMove(index, "down")}
              onToggleChecked={() => handleToggleChecked(item)}
              onTextSave={(text) => handleTextSave(item, text)}
              onDelete={() => handleDelete(item)}
            />
          ))}
          {checkedItems.map((item) => (
            <ItemLine
              key={item.id}
              item={item}
              checkable={kind.checkable}
              canMoveUp={false}
              canMoveDown={false}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              onToggleChecked={() => handleToggleChecked(item)}
              onTextSave={(text) => handleTextSave(item, text)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ul>
      )}

      {kind.checkable && checkedItems.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleUncheckAll}>
            Uncheck all
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearChecked}>
            Clear checked
          </Button>
        </div>
      )}
    </div>
  );
}

function ItemLine({
  item,
  checkable,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleChecked,
  onTextSave,
  onDelete,
}: {
  item: ItemRow;
  checkable: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleChecked: () => void;
  onTextSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(item.text);

  return (
    <li className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted">
      {checkable && (
        <Checkbox
          checked={item.checked}
          onCheckedChange={onToggleChecked}
          aria-label={item.checked ? "Uncheck item" : "Check item"}
        />
      )}
      <input
        id={`item-${item.id}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onTextSave(text)}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-sm outline-none",
          item.checked && "text-muted-foreground line-through",
        )}
      />
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Move up"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          <ChevronUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Move down"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          <ChevronDown />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Delete item"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
