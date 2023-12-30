import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { libraryClient } from "../../../stores/library";

export const load: PageLoad = async ({ params }) => {
  const book = (await libraryClient().listBooks())
    .filter((book) => book.id.toString() === params.slug)
    .at(0);

  return {
    pageTitle: `"${book?.title}" by ${book?.authors.join(", ")}`,
    id: params.slug,
    ...book,
  };
  // error(404, "Not found");
};
