export type JsonRecord = Record<string, unknown>;

/**
 * Dify returns additional fields over time. Keep the original object intact,
 * while documenting the fields used by Zhiyuan's citation mapping.
 */
export interface DifyRetrieverResource extends JsonRecord {
  dataset_id: string;
  document_id: string;
  segment_id: string;
  document_name: string;
  score: number;
  content: string;
}

export interface DifyStreamEvent extends JsonRecord {
  event?: string;
  answer?: string;
  conversation_id?: string;
  message_id?: string;
  metadata?: JsonRecord;
}

export type ZhiyuanStreamEvent =
  | {
      event: "answer.delta";
      data: { answer: string };
    }
  | {
      event: "citations";
      data: { retriever_resources: DifyRetrieverResource[] };
    }
  | {
      event: "done";
      data: { conversation_id?: string; message_id?: string };
    }
  | {
      event: "error";
      data: { code: string; message: string };
    };

