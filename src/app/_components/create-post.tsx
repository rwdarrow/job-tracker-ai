"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export function CreatePost() {
  const router = useRouter();
  const [name, setName] = useState("");

  // const createRole = api.role.create.useMutation({
  //   onSuccess: () => {
  //     router.refresh();
  //     setName("");
  //   },
  // });

  return (
    // <form
    //   onSubmit={(e) => {
    //     e.preventDefault();
    //     createRole.mutate({ name });
    //   }}
    //   className="flex flex-col gap-2"
    // >
    //   <input
    //     type="text"
    //     placeholder="Title"
    //     value={name}
    //     onChange={(e) => setName(e.target.value)}
    //     className="w-full rounded-full px-4 py-2 text-black"
    //   />
    //   <button
    //     type="submit"
    //     className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
    //     disabled={createRole.isPending}
    //   >
    //     {createRole.isPending ? "Submitting..." : "Submit"}
    //   </button>
    // </form>
    <p>Create Post</p>
  );
}
