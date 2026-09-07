import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { PostEdit } from '@/features/feed/post-actions';
import {
  POST_MAX_LENGTH,
  VISIBILITY_OPTIONS,
  visibilityOf,
  type Post,
  type PostVisibility,
} from '@/features/feed/types';

interface PostEditorProps {
  post: Post;
  isSaving: boolean;
  onSave: (changes: PostEdit) => void;
  onCancel: () => void;
}

/**
 * In-place editing of a post's text and visibility.
 *
 * Both fields are optional on `PUT /posts/{id}`, so only what actually changed
 * is sent — the same rule the profile form follows. Images are not editable:
 * the endpoint does not accept them.
 */
export function PostEditor({ post, isSaving, onSave, onCancel }: PostEditorProps) {
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState<PostVisibility>(visibilityOf(post));

  const trimmed = content.trim();
  const originalVisibility = visibilityOf(post);
  const isChanged = trimmed !== post.content.trim() || visibility !== originalVisibility;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const changes: PostEdit = {};
    if (trimmed !== post.content.trim()) {
      changes.content = trimmed;
    }
    if (visibility !== originalVisibility) {
      changes.visibility = visibility;
    }

    onSave(changes);
  };

  return (
    <form className="gap-sm flex flex-col" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={`edit-post-${post.id}`}>
        Edit your post
      </label>
      <textarea
        id={`edit-post-${post.id}`}
        rows={3}
        value={content}
        maxLength={POST_MAX_LENGTH}
        onChange={(event) => {
          setContent(event.target.value);
        }}
        className="font-body text-body text-on-surface bg-surface-container-low border-outline-variant focus:border-primary-container focus:ring-primary-container/20 px-md py-sm w-full resize-none rounded-xl border focus:ring-2 focus:outline-none"
      />

      <div className="gap-sm flex flex-wrap items-center justify-between">
        <div className="w-44">
          <label className="sr-only" htmlFor={`edit-visibility-${post.id}`}>
            Who can see this post
          </label>
          <Select
            id={`edit-visibility-${post.id}`}
            options={VISIBILITY_OPTIONS}
            value={visibility}
            onValueChange={setVisibility}
          />
        </div>

        <div className="gap-sm flex">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={!isChanged}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
