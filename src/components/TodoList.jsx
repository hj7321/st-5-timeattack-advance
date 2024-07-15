import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { todoApi } from "../api/todos";

export default function TodoList() {
  const navigate = useNavigate();
  const {
    data: todos,
    error,
    isPending,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const response = await todoApi.get("/todos");
      return response.data;
    },
  });

  // TODO: 아래 handleLike 로 구현되어 있는 부분을 useMutation 으로 리팩터링 해보세요. 모든 기능은 동일하게 동작해야 합니다.
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: ({ id, currentLiked }) =>
      // 실제로 데이터를 갱신하고 서버로 요청을 보내는 작업
      // 특정 Todo의 liked 상태를 토글함
      todoApi.patch(`/todos/${id}`, {
        liked: !currentLiked,
      }),
    onMutate: async ({ id }) => {
      // 데이터 갱신 요청 전에 실행할 작업들
      await queryClient.cancelQueries({ queryKey: ["todos"] }); // "todos" 쿼리 취소
      const previousTodos = queryClient.getQueryData(["todos"]); // 이전 "todos" 데이터 가져오기
      queryClient.setQueryData(["todos"], (prevTodos) =>
        // 새로운 "todos" 데이터 설정
        prevTodos.map((todo) =>
          todo.id === id ? { ...todo, liked: !todo.liked } : todo
        )
      );
      return { previousTodos }; // 롤백을 위해 이전 데이터 반환
    },
    onError: (err, newTodo, context) => {
      // 에러 발생 시 실행할 작업
      console.error(err);
      queryClient.setQueryData(["todos"], context.previousTodos); // 이전 데이터로 "todos" 데이터 복원
    },
    onSettled: () => {
      // mutate 함수가 끝난 후 실행할 작업
      queryClient.invalidateQueries({ queryKey: ["todos"] }); // "todos" 쿼리 무효화 (다시 불러오기)
    },
  });

  const handleLike = async ({ id, currentLiked }) => {
    likeMutation.mutate({ id, currentLiked });
    // mutate 실행 시 전달인자는 mutationFn과 onMutate의 매개변수로 할당됨
    // mutate 함수에 여러 개의 인자를 전달하고 싶으면 위와 같이 하나의 객체 안에 값을 넣어서 전달함
  };

  if (isPending) {
    return <div style={{ fontSize: 36 }}>로딩중...</div>;
  }

  if (error) {
    console.error(error);
    return (
      <div style={{ fontSize: 24 }}>에러가 발생했습니다: {error.message}</div>
    );
  }

  return (
    <ul style={{ listStyle: "none", width: 250 }}>
      {todos.map((todo) => (
        <li
          key={todo.id}
          style={{
            border: "1px solid black",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <h3>{todo.title}</h3>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => navigate(`/detail/${todo.id}`)}>
              내용보기
            </button>
            {todo.liked ? (
              <FaHeart
                onClick={() => {
                  handleLike({ id: todo.id, currentLiked: todo.liked });
                }}
                style={{ cursor: "pointer" }}
              />
            ) : (
              <FaRegHeart
                onClick={() => {
                  handleLike({ id: todo.id, currentLiked: todo.liked });
                }}
                style={{ cursor: "pointer" }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
