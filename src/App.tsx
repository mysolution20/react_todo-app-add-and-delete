/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { UserWarning } from './UserWarning';
import { addTodo, deleteTodo, getTodos, USER_ID } from './api/todos';
import { Todo } from './types/Todo';

enum Status {
  All = 'All',
  Active = 'Active',
  Completed = 'Completed',
}

type ErrorNotification = {
  message: string;
};

type TodoItemProps = {
  todo: Todo;
  isLoading: boolean;
  onDelete: (todoId: number) => void;
};

const TodoItem: React.FC<TodoItemProps> = ({ todo, isLoading, onDelete }) => (
  <div
    data-cy="Todo"
    className={classNames('todo', {
      completed: todo.completed,
    })}
  >
    <label className="todo__status-label">
      <input
        data-cy="TodoStatus"
        type="checkbox"
        className="todo__status"
        checked={todo.completed}
        disabled
      />
    </label>

    <span data-cy="TodoTitle" className="todo__title">
      {todo.title}
    </span>

    <button
      type="button"
      className="todo__remove"
      data-cy="TodoDelete"
      aria-label="Delete todo"
      disabled={isLoading}
      onClick={() => onDelete(todo.id)}
    >
      ×
    </button>

    <div
      data-cy="TodoLoader"
      className={classNames('modal overlay', {
        'is-active': isLoading,
      })}
    >
      <div
        className={classNames('modal-background', 'has-background-white-ter')}
      />
      <div className="loader" />
    </div>
  </div>
);

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState(Status.All);
  const [title, setTitle] = useState('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [error, setError] = useState<ErrorNotification | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isAddingRef = useRef(false);
  const pendingDeletionsRef = useRef(new Set<number>());

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    let isCancelled = false;

    setError(null);

    getTodos()
      .then(loadedTodos => {
        if (!isCancelled) {
          setTodos(loadedTodos);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError({ message: 'Unable to load todos' });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error]);

  useEffect(() => {
    if (!isLoading && !tempTodo) {
      inputRef.current?.focus();
    }
  }, [isLoading, tempTodo]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading || isAddingRef.current) {
      return;
    }

    const trimmedTitle = title.trim();

    setError(null);

    if (!trimmedTitle) {
      setError({ message: 'Title should not be empty' });
      inputRef.current?.focus();

      return;
    }

    isAddingRef.current = true;

    setTempTodo({
      id: 0,
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    });

    try {
      const createdTodo = await addTodo(trimmedTitle);

      setTodos(currentTodos => [...currentTodos, createdTodo]);
      setTitle('');
    } catch {
      setError({ message: 'Unable to add a todo' });
    } finally {
      isAddingRef.current = false;
      setTempTodo(null);
    }
  };

  const handleDelete = async (todoId: number) => {
    if (pendingDeletionsRef.current.has(todoId)) {
      return;
    }

    pendingDeletionsRef.current.add(todoId);
    setDeletingIds(currentIds => [...currentIds, todoId]);
    setError(null);

    try {
      await deleteTodo(todoId);

      setTodos(currentTodos => {
        return currentTodos.filter(todo => todo.id !== todoId);
      });
    } catch {
      setError({ message: 'Unable to delete a todo' });
    } finally {
      pendingDeletionsRef.current.delete(todoId);

      setDeletingIds(currentIds => {
        return currentIds.filter(id => id !== todoId);
      });

      inputRef.current?.focus();
    }
  };

  const handleClearCompleted = () => {
    todos
      .filter(todo => todo.completed)
      .forEach(todo => {
        void handleDelete(todo.id);
      });
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const hasTodos = todos.length > 0;
  const hasCompletedTodos = todos.some(todo => todo.completed);
  const allTodosCompleted = hasTodos && activeTodosCount === 0;

  const visibleTodos = todos.filter(todo => {
    switch (status) {
      case Status.Active:
        return !todo.completed;

      case Status.Completed:
        return todo.completed;

      default:
        return true;
    }
  });

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {hasTodos && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: allTodosCompleted,
              })}
              data-cy="ToggleAllButton"
              aria-label="Toggle all todos"
              disabled
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={title}
              disabled={isLoading || tempTodo !== null}
              onChange={event => setTitle(event.target.value)}
            />
          </form>
        </header>

        {(hasTodos || tempTodo !== null) && (
          <section className="todoapp__main" data-cy="TodoList">
            {visibleTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                isLoading={deletingIds.includes(todo.id)}
                onDelete={handleDelete}
              />
            ))}

            {tempTodo && (
              <TodoItem todo={tempTodo} isLoading onDelete={handleDelete} />
            )}
          </section>
        )}

        {hasTodos && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeTodosCount} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: status === Status.All,
                })}
                data-cy="FilterLinkAll"
                onClick={() => setStatus(Status.All)}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: status === Status.Active,
                })}
                data-cy="FilterLinkActive"
                onClick={() => setStatus(Status.Active)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: status === Status.Completed,
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setStatus(Status.Completed)}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!hasCompletedTodos}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          aria-label="Close error notification"
          onClick={() => setError(null)}
        />

        {error?.message}
      </div>
    </div>
  );
};
