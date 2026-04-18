import { ACTION_ARCHIVE_FULL, ACTION_ARCHIVE_SUMMARY, ACTION_ARCHIVE_ACTION_ITEMS, ACTION_ARCHIVE_CANCEL, } from '../constants/action-ids';
export class CardBuilder {
    elements = [];
    static new() {
        return new CardBuilder();
    }
    header(title, template = 'blue') {
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
    div(content) {
        this.elements.push({
            tag: 'div',
            text: {
                tag: 'lark_md',
                content,
            },
        });
        return this;
    }
    button(text, actionId, type = 'default', url) {
        const action = {
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
    selectStatic(placeholder, options, actionId) {
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
    hr() {
        this.elements.push({ tag: 'hr' });
        return this;
    }
    build() {
        if (this.elements.length === 0) {
            return { schema: '2.0', card: { elements: [] } };
        }
        const cardElement = this.elements.find((e) => e.tag === 'card');
        if (cardElement && typeof cardElement.card === 'object' && cardElement.card !== null) {
            const nonCardElements = this.elements.filter((e) => e !== cardElement);
            cardElement.card.elements = nonCardElements;
        }
        return {
            schema: '2.0',
            card: cardElement?.card || { elements: this.elements },
        };
    }
    static sessionStarterCard(modelOptions) {
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
    static streamingCard(modelName, initialContent = '正在思考...') {
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
    static archiveConfirmCard() {
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
//# sourceMappingURL=card-builder.js.map