/**
 * The group -> module -> item tree from the "component architecture" doc.
 * Visibility is computed top-down and never destroys state:
 *   effective(item) = group.visible && module.visible && item.visible
 */

export interface LayerItem {
  id: string;
}

export interface ItemNode {
  id: string;
  visible: boolean;
  label?: string;
}

export interface ModuleNode {
  id: string;
  groupId: string;
  label: string;
  visible: boolean;
  items: ItemNode[];
}

export interface GroupNode {
  id: string;
  label: string;
  visible: boolean;
  modules: ModuleNode[];
}

export interface LayerTree {
  groups: GroupNode[];
}
