export type Script = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  sql_script: string;
  categories: string[];
  tags: string[];
  version: string | null;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  design_content: any;
  created_at: string;
  updated_at: string;
};
