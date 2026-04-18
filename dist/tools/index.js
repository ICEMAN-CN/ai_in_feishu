export class ToolRegistry {
    tools = new Map();
    constructor(readTool, searchTool, saveTool) {
        this.registerTool(readTool);
        this.registerTool(searchTool);
        this.registerTool(saveTool);
    }
    registerTool(handler) {
        const definition = handler.getToolDefinition();
        this.tools.set(definition.name, {
            name: definition.name,
            description: definition.description,
            parameters: definition.parameters,
            handler: handler.execute.bind(handler),
        });
    }
    getTools() {
        return Array.from(this.tools.values());
    }
    getTool(name) {
        return this.tools.get(name);
    }
    getToolNames() {
        return Array.from(this.tools.keys());
    }
    toVercelTools() {
        const tools = [];
        for (const tool of this.tools.values()) {
            tools.push({
                description: tool.description,
                parameters: tool.parameters,
            });
        }
        return tools;
    }
}
//# sourceMappingURL=index.js.map