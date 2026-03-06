import { BookView } from "@/BookView";
import { LibraryBook } from "@/bindings";
import { Box, LoadingOverlay, SimpleGrid } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { BookCard } from "../atoms/BookCard";

export const BookGrid = ({ loading, bookList, onBookOpen }: BookView) => {
  const actionsContext = useMemo(() => {
    return {
      onViewBook: onBookOpen,
    };
  }, [onBookOpen]);

  return (
    <bookActionsContext.Provider value={actionsContext}>
      <BookGridPure loading={loading} bookList={bookList} />
    </bookActionsContext.Provider>
  );
};

const BookGridPure = ({
  loading,
  bookList: books,
}: {
  loading: boolean;
  bookList: LibraryBook[];
}) => {
  const actions = useContext(bookActionsContext);

  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} />
      <SimpleGrid cols={{ base: 2, md: 4, lg: 5 }} spacing={4} verticalSpacing="md">
        {books.map((book) => (
          <BookCard key={book.id} book={book} actions={actions} />
        ))}
      </SimpleGrid>
    </Box>
  );
};

type BookAction = (bookId: LibraryBook["id"]) => void;
interface BookActionsContext {
  onViewBook: BookAction;
}
const bookActionsContext = createContext<BookActionsContext>(
  null as unknown as BookActionsContext,
);
