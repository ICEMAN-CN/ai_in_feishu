export interface CardElement {
    tag: string;
    [key: string]: unknown;
}
export interface CardAction {
    tag: 'button' | 'select_static' | 'overflow';
    text?: {
        tag: 'plain_text';
        content: string;
    };
    placeholder?: {
        tag: 'plain_text';
        content: string;
    };
    options?: Array<{
        label: string;
        value: string;
    }>;
    actions?: CardAction[];
    type?: string;
    url?: string;
    action_id?: string;
    value?: Record<string, string>;
    [key: string]: unknown;
}
export type CardTemplate = 'blue' | 'grey' | 'green' | 'orange' | 'red' | 'purple';
export type ButtonType = 'primary' | 'default';
export declare class CardBuilder {
    private elements;
    static new(): CardBuilder;
    header(title: string, template?: CardTemplate): this;
    div(content: string): this;
    button(text: string, actionId: string, type?: ButtonType, url?: string): this;
    selectStatic(placeholder: string, options: Array<{
        label: string;
        value: string;
    }>, actionId: string): this;
    hr(): this;
    build(): object;
    static sessionStarterCard(modelOptions: Array<{
        label: string;
        value: string;
    }>): object;
    static streamingCard(modelName: string, initialContent?: string): object;
    static archiveConfirmCard(): object;
}
//# sourceMappingURL=card-builder.d.ts.map