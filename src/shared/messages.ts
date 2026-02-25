export enum MessageType {
  // Content extraction
  GET_PAGE_CONTENT = 'GET_PAGE_CONTENT',
  GET_SELECTED_TEXT = 'GET_SELECTED_TEXT',

  // Context menu
  CONTEXT_MENU_ACTION = 'CONTEXT_MENU_ACTION',

  // Custom commands
  REBUILD_CONTEXT_MENUS = 'REBUILD_CONTEXT_MENUS',
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GetPageContentMessage {
  type: MessageType.GET_PAGE_CONTENT;
}

export interface GetSelectedTextMessage {
  type: MessageType.GET_SELECTED_TEXT;
}

export interface ContextMenuActionMessage {
  type: MessageType.CONTEXT_MENU_ACTION;
  payload: {
    action: string;
    text: string;
  };
}

export interface RebuildContextMenusMessage {
  type: MessageType.REBUILD_CONTEXT_MENUS;
}

export type ExtensionMessage =
  | GetPageContentMessage
  | GetSelectedTextMessage
  | ContextMenuActionMessage
  | RebuildContextMenusMessage;
