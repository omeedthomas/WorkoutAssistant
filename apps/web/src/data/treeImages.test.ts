import { describe, expect, it } from 'vitest';
import { trees } from '@ascent/core/data';
import { treeImages } from './treeImages';

describe('tree card photos', () => {
  it('has a Home card photo for every tree', () => {
    for (const tree of trees) expect(treeImages[tree.id], tree.id).toMatch(/\.webp/);
  });
});
