export type PostStatus = "draft" | "publish" | "pending" | "private";
export type PostType = "posts" | "pages";

export interface PublisherSettings {
  siteUrl: string;
  username: string;
  applicationPassword: string;
  defaultStatus: PostStatus;
  postType: PostType;
  removeTitleHeading: boolean;
  uploadImages: boolean;
}

export interface PublishMetadata {
  title: string;
  status: PostStatus;
  postType: PostType;
  postId?: number;
  slug?: string;
  excerpt?: string;
  date?: string;
  categories: Array<string | number>;
  tags: Array<string | number>;
}

export interface WordPressPostResponse {
  id: number;
  link: string;
  status: string;
}

export interface UploadResult {
  id: number;
  sourceUrl: string;
}
