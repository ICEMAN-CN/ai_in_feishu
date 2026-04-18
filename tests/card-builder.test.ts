import { describe, it, expect } from 'vitest';
import { CardBuilder } from '../src/feishu/card-builder';

describe('CardBuilder', () => {
  describe('static new()', () => {
    it('should create empty builder', () => {
      const builder = CardBuilder.new();
      expect(builder).toBeDefined();
    });
  });

  describe('header()', () => {
    it('should add card header with default blue template', () => {
      const card = CardBuilder.new().header('Test Title').build() as any;
      expect(card.schema).toBe('2.0');
      expect(card.card.header.title.content).toBe('Test Title');
      expect(card.card.header.template).toBe('blue');
    });

    it('should add card header with custom template', () => {
      const card = CardBuilder.new().header('Red Card', 'red').build() as any;
      expect(card.card.header.template).toBe('red');
    });

    it('should support all template colors', () => {
      const templates = ['blue', 'grey', 'green', 'orange', 'red', 'purple'] as const;
      templates.forEach((template) => {
        const card = CardBuilder.new().header('Test', template).build() as any;
        expect(card.card.header.template).toBe(template);
      });
    });

    it('should return builder for chaining', () => {
      const builder = CardBuilder.new();
      const result = builder.header('Title');
      expect(result).toBe(builder);
    });
  });

  describe('div()', () => {
    it('should add div element with markdown content', () => {
      const card = CardBuilder.new().div('Hello **world**').build() as any;
      expect(card.card.elements[0].tag).toBe('div');
      expect(card.card.elements[0].text.content).toBe('Hello **world**');
      expect(card.card.elements[0].text.tag).toBe('lark_md');
    });

    it('should return builder for chaining', () => {
      const builder = CardBuilder.new();
      const result = builder.div('content');
      expect(result).toBe(builder);
    });
  });

  describe('button()', () => {
    it('should add button with default type', () => {
      const card = CardBuilder.new().button('Click me', 'action_1').build() as any;
      const action = card.card.elements[0].actions[0];
      expect(action.tag).toBe('button');
      expect(action.text.content).toBe('Click me');
      expect(action.action_id).toBe('action_1');
      expect(action.type).toBe('default');
    });

    it('should add primary button', () => {
      const card = CardBuilder.new().button('Submit', 'action_submit', 'primary').build() as any;
      expect(card.card.elements[0].actions[0].type).toBe('primary');
    });

    it('should add button with URL', () => {
      const card = CardBuilder.new().button('Open', 'action_open', 'default', 'https://example.com').build() as any;
      expect(card.card.elements[0].actions[0].url).toBe('https://example.com');
    });

    it('should return builder for chaining', () => {
      const builder = CardBuilder.new();
      const result = builder.button('Click', 'action');
      expect(result).toBe(builder);
    });
  });

  describe('selectStatic()', () => {
    it('should add select with options', () => {
      const options = [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
      ];
      const card = CardBuilder.new().selectStatic('Select...', options, 'select_1').build() as any;
      const action = card.card.elements[0].actions[0];
      expect(action.tag).toBe('select_static');
      expect(action.placeholder.content).toBe('Select...');
      expect(action.options).toEqual(options);
      expect(action.action_id).toBe('select_1');
    });

    it('should return builder for chaining', () => {
      const builder = CardBuilder.new();
      const options = [{ label: 'A', value: 'a' }];
      const result = builder.selectStatic('Pick', options, 'sel');
      expect(result).toBe(builder);
    });
  });

  describe('hr()', () => {
    it('should add horizontal divider', () => {
      const card = CardBuilder.new().hr().build() as any;
      expect(card.card.elements[0].tag).toBe('hr');
    });

    it('should return builder for chaining', () => {
      const builder = CardBuilder.new();
      const result = builder.hr();
      expect(result).toBe(builder);
    });
  });

  describe('build()', () => {
    it('should return empty card when no elements', () => {
      const card = CardBuilder.new().build() as any;
      expect(card.schema).toBe('2.0');
      expect(card.card.elements).toEqual([]);
    });

    it('should assemble card with header first', () => {
      const card = CardBuilder.new().header('Title').div('Content').button('Btn', 'b').build() as any;
      expect(card.card.header.title.content).toBe('Title');
      expect(card.card.elements.length).toBe(2);
      expect(card.card.elements[0].tag).toBe('div');
      expect(card.card.elements[1].tag).toBe('action');
    });

    it('should build complex card with all elements', () => {
      const options = [{ label: 'A', value: 'a' }];
      const card = CardBuilder.new()
        .header('Complex Card', 'purple')
        .div('Introduction text')
        .selectStatic('Choose option', options, 'sel1')
        .hr()
        .button('Confirm', 'confirm', 'primary')
        .button('Cancel', 'cancel')
        .build() as any;

      expect(card.schema).toBe('2.0');
      expect(card.card.header.title.content).toBe('Complex Card');
      expect(card.card.header.template).toBe('purple');
      expect(card.card.elements.length).toBe(5);
      expect(card.card.elements[0].tag).toBe('div');
      expect(card.card.elements[1].tag).toBe('action');
      expect(card.card.elements[2].tag).toBe('hr');
      expect(card.card.elements[3].tag).toBe('action');
      expect(card.card.elements[4].tag).toBe('action');
    });
  });

  describe('static sessionStarterCard()', () => {
    it('should build session starter card with model options', () => {
      const options = [
        { label: 'GPT-4', value: 'gpt4' },
        { label: 'Claude', value: 'claude' },
      ];
      const card = CardBuilder.sessionStarterCard(options) as any;

      expect(card.schema).toBe('2.0');
      expect(card.card.header.title.content).toBe('🆕 新建 AI 对话');
      expect(card.card.header.template).toBe('blue');
      expect(card.card.elements.length).toBe(4);
      expect(card.card.elements[0].tag).toBe('div');
      expect(card.card.elements[0].text.content).toBe('选择一个AI引擎开始对话');

      const selectAction = card.card.elements[1].actions[0];
      expect(selectAction.tag).toBe('select_static');
      expect(selectAction.options).toEqual(options);
      expect(selectAction.action_id).toBe('model_select');

      expect(card.card.elements[2].tag).toBe('hr');

      const buttonAction = card.card.elements[3].actions[0];
      expect(buttonAction.tag).toBe('button');
      expect(buttonAction.text.content).toBe('🚀 开始对话');
      expect(buttonAction.type).toBe('primary');
      expect(buttonAction.action_id).toBe('start_conversation');
    });

    it('should handle empty options', () => {
      const card = CardBuilder.sessionStarterCard([]) as any;
      expect(card.card.elements[1].actions[0].options).toEqual([]);
    });
  });

  describe('static streamingCard()', () => {
    it('should build streaming card with model name', () => {
      const card = CardBuilder.streamingCard('GPT-4') as any;

      expect(card.schema).toBe('2.0');
      expect(card.card.header.title.content).toBe('🤖 GPT-4');
      expect(card.card.header.template).toBe('grey');
      expect(card.card.elements.length).toBe(3);

      const contentDiv = card.card.elements[0];
      expect(contentDiv.tag).toBe('div');
      expect(contentDiv.id).toBe('response_content');
      expect(contentDiv.text.content).toBe('正在思考...');

      expect(card.card.elements[1].tag).toBe('hr');
      expect(card.card.elements[1].id).toBe('divider');

      const note = card.card.elements[2];
      expect(note.tag).toBe('note');
      expect(note.elements[0].content).toBe('流式输出中...');
    });

    it('should use custom initial content', () => {
      const card = CardBuilder.streamingCard('Claude', 'Loading...') as any;
      expect(card.card.elements[0].text.content).toBe('Loading...');
    });
  });

  describe('static archiveConfirmCard()', () => {
    it('should build archive confirmation card', () => {
      const card = CardBuilder.archiveConfirmCard() as any;

      expect(card.schema).toBe('2.0');
      expect(card.card.header.title.content).toBe('💾 归档确认');
      expect(card.card.header.template).toBe('green');
      expect(card.card.elements.length).toBe(2);

      expect(card.card.elements[0].tag).toBe('div');
      expect(card.card.elements[0].text.content).toBe('是否将当前对话归档为飞书文档？');

      const buttons = card.card.elements[1].actions;
      expect(buttons.length).toBe(4);
      expect(buttons[0].text.content).toBe('📄 完整归档');
      expect(buttons[0].action_id).toBe('archive_full');
      expect(buttons[0].type).toBe('primary');

      expect(buttons[1].text.content).toBe('📝 摘要归档');
      expect(buttons[1].action_id).toBe('archive_summary');

      expect(buttons[2].text.content).toBe('📋 行动项归档');
      expect(buttons[2].action_id).toBe('archive_action_items');

      expect(buttons[3].text.content).toBe('❌ 取消');
      expect(buttons[3].action_id).toBe('archive_cancel');
    });
  });
});