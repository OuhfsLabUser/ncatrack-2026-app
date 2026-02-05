CREATE TABLE pick_list_item (
  item_id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL,
  value VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (list_id) REFERENCES pick_list (list_id)
);