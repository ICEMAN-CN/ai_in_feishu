import {
  ACTION_ARCHIVE_FULL,
  ACTION_ARCHIVE_SUMMARY,
  ACTION_ARCHIVE_ACTION_ITEMS,
  ACTION_ARCHIVE_CANCEL,
} from '../constants/action-ids';

export interface CardElement {
  tag: string;
  [key: string]: unknown;
}

export interface CardAction {
  tag: 'button' | 'select_static' | 'overflow';
  text?: { tag: 'plain_text'; content: string };
  placeholder?: { tag: 'plain_text'; content: string };
  options?: Array<{ label: string; value: string }>;
  actions?: CardAction[];
  type?: string;
  url?: string;
  action_id?: string;
  value?: Record<string, string>;
  [key: string]: unknown;
}

export type CardTemplate = 'blue' | 'grey' | 'green' | 'orange' | 'red' | 'purple';
export type ButtonType = 'primary' | 'default';

export class CardBuilder {
  private elements: CardElement[] = [];

  static new(): CardBuilder {
    return new CardBuilder();
  }

  header(title: string, template: CardTemplate = 'blue'): this {
    this.elements.unshift({
      tag: 'card',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: title,
          },
          template,
        },
        elements: [],
      },
    });
    return this;
  }

  div(content: string): this {
    this.elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content,
      },
    });
    return this;
  }

  button(text: string, actionId: string, type: ButtonType = 'default', url?: string): this {
    const action: CardAction = {
      tag: 'button',
      text: {
        tag: 'plain_text',
        content: text,
      },
      type,
      action_id: actionId,
    };
    if (url) {
      action.url = url;
    }
    this.elements.push({
      tag: 'action',
      actions: [action],
    });
    return this;
  }

  selectStatic(
    placeholder: string,
    options: Array<{ label: string; value: string }>,
    actionId: string
  ): this {
    this.elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'select_static',
          placeholder: {
            tag: 'plain_text',
            content: placeholder,
          },
          options,
          action_id: actionId,
        },
      ],
    });
    return this;
  }

  hr(): this {
    this.elements.push({ tag: 'hr' });
    return this;
  }

  build(): object {
    if (this.elements.length === 0) {
      return { schema: '2.0', card: { elements: [] } };
    }

    const cardElement = this.elements.find((e) => e.tag === 'card');
    if (cardElement && typeof cardElement.card === 'object' && cardElement.card !== null) {
      const nonCardElements = this.elements.filter((e) => e !== cardElement);
      (cardElement.card as { elements: CardElement[] }).elements = nonCardElements;
    }

    return {
      schema: '2.0',
      card: cardElement?.card || { elements: this.elements },
    };
  }

  static sessionStarterCard(modelOptions: Array<{ label: string; value: string }>): object {
    return {
      schema: '2.0',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '🆕 新建 AI 对话',
          },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: '选择一个AI引擎开始对话',
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'select_static',
                placeholder: {
                  tag: 'plain_text',
                  content: '选择 AI 引擎',
                },
                options: modelOptions,
                action_id: 'model_select',
              },
            ],
          },
          { tag: 'hr' },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  tag: 'plain_text',
                  content: '🚀 开始对话',
                },
                type: 'primary',
                action_id: 'start_conversation',
              },
            ],
          },
        ],
      },
    };
  }

  static streamingCard(modelName: string, initialContent: string = '正在思考...'): object {
    return {
      schema: '2.0',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `🤖 ${modelName}`,
          },
          template: 'grey',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: initialContent,
            },
            id: 'response_content',
          },
          { tag: 'hr', id: 'divider' },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: '流式输出中...',
              },
            ],
          },
        ],
      },
    };
  }

  static archiveConfirmCard(): object {
    return {
      schema: '2.0',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: '💾 归档确认',
          },
          template: 'green',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: '是否将当前对话归档为飞书文档？',
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '📄 完整归档' },
                type: 'primary',
                action_id: ACTION_ARCHIVE_FULL,
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '📝 摘要归档' },
                action_id: ACTION_ARCHIVE_SUMMARY,
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '📋 行动项归档' },
                action_id: ACTION_ARCHIVE_ACTION_ITEMS,
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '❌ 取消' },
                action_id: ACTION_ARCHIVE_CANCEL,
              },
            ],
          },
        ],
      },
    };
  }
}