import TreeModel from "tree-model";

export type FileTreeNode = {
  name: string,
  path: string,
  type: 'file'|'directory',
  mtime: number,
  hash?: string,
  children?: FileTreeNode[]
}

export type FileTreeModel = TreeModel.Node<FileTreeNode>|null;

const treeModel = new TreeModel();

export function parseFileTreeModel(node: FileTreeNode|null): FileTreeModel {
  return node ? treeModel.parse(node) : null;
}

const parse = parseFileTreeModel; // shortcut

export function diffTrees(
  tree1: FileTreeModel,
  tree2: FileTreeModel
): { upload: FileTreeModel[]; remove: FileTreeModel[]; localRemove: FileTreeModel[]; download: FileTreeModel[] } {
  const upload: FileTreeModel[] = [];
  const remove: FileTreeModel[] = [];
  const localRemove: FileTreeModel[] = [];
  const download: FileTreeModel[] = [];

  // Helper function to compare nodes recursively
  function compareNodes(node1: FileTreeModel, node2: FileTreeModel) {
    console.log('compareNodes', node1, node2);
    if (!node1 && node2) {
      // TODO: check for local removing
      download.push(node2); // Node exists only in tree2
      return;
    }
    if (node1 && !node2) {
      // TODO: check for remote removing
      upload.push(node1); // Node exists only in tree1
      return;
    }
    if (node1 && node2) {
      if (node1.model.type !== node2.model.type) {
        // Different types, file instead of directory, and vice versa, so remove and upload
        if (node1.model.mtime > node2.model.mtime) {
          remove.push(node2);
          upload.push(node1);
        } else {
          localRemove.push(node1);
          download.push(node2);
        }
        return;
      }

      if (node1.model.type === 'file') {
        if (node1.model.hash !== node2.model.hash) {
          // File content differs
          if (node1.model.mtime > node2.model.mtime) {
            upload.push(node1);
          } else {
            download.push(node2);
          }
        }
        return;
      } else if (node1.model.type === 'directory') {
        node1.model.children.forEach((child1, i) => {
          const child2 = node2.model.children.find(c => c.name === child1.name);
          compareNodes(parse(child1), parse(child2));
        });
        node2.model.children.forEach((child2, i) => {
          const child1 = node1.model.children.find(c => c.name === child2.name);
          if(!child1) { // if child1 exists it was compared in the previous loop, now we are searching for new children
            compareNodes(parse(child1), parse(child2));
          }
        });
      }
    }
  }

  compareNodes(tree1, tree2);

  return { upload, remove, localRemove, download };
}
