main -> expr

expr -> term
      | expr "+" term
      | expr "-" term

term -> factor
      | term "*" factor

factor -> number
        | "(" expr ")"

number -> [0-9]:+
