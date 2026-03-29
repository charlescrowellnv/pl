# Postgres SQL Style — Reference

## General Rules

- Lowercase SQL reserved words
- Consistent, descriptive identifiers
- White space and indentation for readability
- Dates in ISO 8601 format (`yyyy-mm-ddThh:mm:ss.sssss`)
- Block comments: `/* ... */`, line comments: `--`

## Naming Conventions

- Avoid SQL reserved words; names under 63 characters
- `snake_case` for tables (plural) and columns (singular)
- No `tbl_` prefixes; no table name matching a column name
- Foreign key columns: singular table name + `_id` (e.g., `user_id` → `users`)

## Tables

```sql
create table books (
  id bigint generated always as identity primary key,
  title text not null,
  author_id bigint references authors (id)
);
comment on table books is 'A list of all the books in the library.';
```

- Always `id bigint generated always as identity primary key`
- Always in `public` schema unless specified otherwise
- Always add schema prefix in queries
- Always add a `comment on table`

## Queries

Smaller queries — keep concise:

```sql
select *
from employees
where end_date is null;

update employees
set end_date = '2023-12-31'
where employee_id = 1001;
```

Larger queries — add newlines:

```sql
select
  first_name,
  last_name
from employees
where start_date between '2021-01-01' and '2021-12-31'
  and status = 'employed';
```

## Joins and Subqueries

Prefer full table names for clarity:

```sql
select
  employees.employee_name,
  departments.department_name
from
  employees
  join departments on employees.department_id = departments.department_id
where employees.start_date > '2022-01-01';
```

## Aliases

Always use the `as` keyword:

```sql
select count(*) as total_employees
from employees
where end_date is null;
```

## Complex Queries and CTEs

Prefer CTEs for complex logic; comment each block:

```sql
with
  department_employees as (
    -- Get all employees and their departments
    select
      employees.department_id,
      employees.first_name,
      employees.last_name,
      departments.department_name
    from
      employees
      join departments on employees.department_id = departments.department_id
  ),
  employee_counts as (
    -- Count how many employees in each department
    select
      department_name,
      count(*) as num_employees
    from department_employees
    group by department_name
  )
select
  department_name,
  num_employees
from employee_counts
order by department_name;
```
