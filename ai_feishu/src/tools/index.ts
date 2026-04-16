import { ReadFeishuUrlToolHandler } from './read_feishu_url';
import { SearchLocalKbToolHandler } from './search_local_kb';
import { SaveToNewDocToolHandler } from './save_to_new_doc';

export interface AITool {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<string>;
}

export class ToolRegistry {
  private tools: Map<string, AITool> = new Map();

  constructor(
    readTool: ReadFeishuUrlToolHandler,
    searchTool: SearchLocalKbToolHandler,
    saveTool: SaveToNewDocToolHandler
  ) {
    this.registerTool(readTool);
    this.registerTool(searchTool);
    this.registerTool(saveTool);
  }

  private registerTool(handler: {
    getToolDefinition(): { name: string; description: string; parameters: any };
    execute(...args: any[]): Promise<string>;
  }): void {
    const definition = handler.getToolDefinition();
    this.tools.set(definition.name, {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
      handler: handler.execute.bind(handler),
    });
  }

  getTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  toVercelTools() {
    const tools: any[] = [];

    for (const tool of this.tools.values()) {
      tools.push({
        description: tool.description,
        parameters: tool.parameters,
      });
    }

    return tools;
  }
}

export {};