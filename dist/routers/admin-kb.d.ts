import { Hono } from 'hono';
import { KBFolderManager } from '../core/kb-folder-manager';
import { RAGPipeline } from '../services/rag-pipeline';
import { VectorStoreService } from '../core/vector-store-service';
declare const adminKb: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export declare function initKBRouter(fm: KBFolderManager, rp: RAGPipeline): void;
export declare function initRAGRouter(rp: RAGPipeline, vs: VectorStoreService, fm?: KBFolderManager): void;
export default adminKb;
//# sourceMappingURL=admin-kb.d.ts.map