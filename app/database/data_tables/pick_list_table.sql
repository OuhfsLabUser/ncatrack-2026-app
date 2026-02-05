CREATE TABLE pick_list (
  list_id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL,
  list_name VARCHAR(100) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES pick_list_category (category_id)
);