import { ItemStack, system, world } from "@minecraft/server";
import { Block, Vector } from "./beta";

class Tree {
	static woodTypes = [
		"acacia",
		"birch",
		"cherry",
		"dark_oak",
		"jungle",
		"mangrove",
		"oak",
		"spruce",
	];
	constructor(woodType, block, player) {
		this.wood = woodType + "_log";
		this.type = woodType;
		this.origin = block;
		this.dimension = block.dimension;
		this.valid = false;
		this.logs = new Set();
		this.leaf = "leaves";
		this.leaves = new Set();
		this.validation = {
			up: false,
			north: false,
			south: false,
			east: false,
			west: false,
		};
		this.leafPermutation = { persistent_bit: false };
		this.source = player;
		switch (woodType) {
			case "acacia":
			case "dark_oak":
				this.leafPermutation.new_leaf_type = woodType;
				this.leaf += "2";
				break;
			case "cherry":
				this.leaf = "cherry_leaves";
				break;
			case "mangrove":
				this.leaf = "mangrove_leaves";
				break;
			default:
				this.leafPermutation.old_leaf_type = woodType;
				break;
		}
	}
	validate() {
		let stack = [];
		let visited = new Set();
		stack.push(this.origin);
		visited.add(JSON.stringify(this.origin.location));

		while (stack.length > 0 && !this.valid) {
			let path = stack.pop();

			if (Block.is(path.above(), this.leaf, this.leafPermutation))
				this.validation.up = true;
			if (Block.is(path.north(), this.leaf, this.leafPermutation))
				this.validation.north = true;
			if (Block.is(path.south(), this.leaf, this.leafPermutation))
				this.validation.south = true;
			if (Block.is(path.east(), this.leaf, this.leafPermutation))
				this.validation.east = true;
			if (Block.is(path.west(), this.leaf, this.leafPermutation))
				this.validation.west = true;

			if (
				Block.is(path.above(), this.wood) &&
				!visited.has(JSON.stringify(path.above().location))
			) {
				stack.push(path.above());
				visited.add(JSON.stringify(path.above().location));
			}
			Vector.offsetList.forEach((location) => {
				let offset = path.offset(location);
				if (
					Block.is(offset, this.wood) &&
					!visited.has(JSON.stringify(offset.location))
				) {
					stack.push(offset);
					visited.add(JSON.stringify(offset.location));
				}
				if (
					Block.is(offset.above(), this.wood) &&
					!visited.has(JSON.stringify(offset.above().location))
				) {
					stack.push(offset.above());
					visited.add(JSON.stringify(offset.above().location));
				}
			});

			if (Object.values(this.validation).every((bool) => bool === true))
				this.valid = true;
		}
	}
	breakTree() {
		system.runTimeout(() => this.breakLogs(), 1);
		system.runTimeout(() => {
			this.breakLeaves();
			let logItem = new ItemStack(this.wood);
			let logs = Array.from(this.logs);
			let leaves = Array.from(this.leaves);
			let leafCutInterval1 = system.runInterval(() => {
				let end = async () => {
					Block.destroy(JSON.parse(leaves.pop()), this.dimension);
					this.source.runCommandAsync(
						`loot spawn ${this.source.location.x} ${this.source.location.y} ${this.source.location.z} loot "blocks/${this.type}_leaf" mainhand`
					);
				};
				if (leaves.length > 3) {
					end();
					end();
					end();
				} else if (leaves.length > 0) end();
				else system.clearRun(leafCutInterval1);
			}, 1);
			let leafCutInterval2 = system.runInterval(() => {
				let start = async () => {
					Block.destroy(JSON.parse(leaves.shift()), this.dimension);
					this.source.runCommandAsync(
						`loot spawn ~ ~ ~ loot ${this.type}_leaf mainhand`
					);
				};
				if (leaves.length > 3) {
					start();
					start();
					start();
				} else if (leaves.length > 0) start();
				else system.clearRun(leafCutInterval2);
			}, 1);
			system.runTimeout(() => {
				let logCutInterval = system.runInterval(() => {
					if (logs.length > 0) {
						let location = JSON.parse(logs.shift());
						Block.destroy(location, this.dimension);
						this.dimension.spawnItem(logItem, this.source.location);
						world.playSound("dig.wood", location);
					} else {
						this.source.setDynamicProperty("cutting", false);
						system.clearRun(logCutInterval);
					}
				}, 1);
			}, 1);
			this.logs.clear();
			this.leaves.clear();
		}, 2);
	}
	breakLogs() {
		let stack = [];
		stack.push(this.origin);

		while (stack.length > 0) {
			let path = stack.pop();

			if (
				!this.logs.has(JSON.stringify(path.location)) &&
				Math.abs(path.location.x) - Math.abs(this.origin.x) < 8 &&
				Math.abs(path.location.z) - Math.abs(this.origin.z) < 8
			) {
				this.logs.add(JSON.stringify(path.location));
				if (Block.is(path.above(), this.wood)) {
					stack.push(path.above());
				}
				Vector.offsetList.forEach((location) => {
					let offset = path.offset(location);
					if (Block.is(offset, this.wood)) stack.push(offset);
					if (Block.is(offset.above(), this.wood))
						stack.push(offset.above());
				});
			}
		}
	}

	breakLeaves() {
		let queue = Array.from(this.logs);

		while (queue.length > 0) {
			let block = this.dimension.getBlock(JSON.parse(queue.shift()));
			let leafAbove = JSON.stringify(block.above().location);
			let leaf = JSON.stringify(block.location);
			if (
				Block.is(block.above(), this.leaf, this.leafPermutation) &&
				!this.leaves.has(leafAbove)
			) {
				this.leaves.add(leafAbove);
				queue.push(leafAbove);
			}
			Vector.offsetList.forEach((location) => {
				let offset = block.offset(location);
				if (Block.is(offset, this.leaf, this.leafPermutation)) {
					leaf = JSON.stringify(offset.location);
					if (!this.leaves.has(leaf)) {
						this.leaves.add(leaf);
						queue.push(leaf);
					}
				}
				if (Block.is(offset.above(), this.leaf, this.leafPermutation)) {
					leaf = JSON.stringify(offset.above().location);
					if (!this.leaves.has(leaf)) {
						this.leaves.add(leaf);
						queue.push(leaf);
					}
				}
			});
		}
	}
}

export default Tree;

// breakLeaves() {
// 	let queue = Array.from(this.logs);
// 	let visited = new Set();

// 	while (queue.length > 0) {
// 		let block = this.dimension.getBlock(JSON.parse(queue.shift()));
// 		let leafAbove = JSON.stringify(block.above().location);
// 		let leaf = JSON.stringify(block.location);

// 		// Check if the leaf block is within a certain distance from the origin
// 		if (
// 			Math.abs(block.location.x - this.origin.x) <= MAX_DISTANCE &&
// 			Math.abs(block.location.z - this.origin.z) <= MAX_DISTANCE
// 		) {
// 			// Check if the leaf block is within a certain distance from the nearest log
// 			if (
// 				Block.is(block.above(), this.leaf, this.leafPermutation) &&
// 				!this.leaves.has(leafAbove) &&
// 				this.isWithinLogDistance(block.above())
// 			) {
// 				this.leaves.add(leafAbove);
// 				queue.push(leafAbove);
// 			}
// 			Vector.offsetList.forEach((location) => {
// 				let offset = block.offset(location);
// 				if (
// 					Block.is(offset, this.leaf, this.leafPermutation) &&
// 					this.isWithinLogDistance(offset)
// 				) {
// 					leaf = JSON.stringify(offset.location);
// 					if (!this.leaves.has(leaf)) {
// 						this.leaves.add(leaf);
// 						queue.push(leaf);
// 					}
// 				}
// 				if (
// 					Block.is(offset.above(), this.leaf, this.leafPermutation) &&
// 					this.isWithinLogDistance(offset.above())
// 				) {
// 					leaf = JSON.stringify(offset.above().location);
// 					if (!this.leaves.has(leaf)) {
// 						this.leaves.add(leaf);
// 						queue.push(leaf);
// 					}
// 				}
// 			});
// 		}
// 	}
// }

// isWithinLogDistance(block) {
// 	// Implement a check here to determine if the block is within a certain distance from the nearest log
// 	// You can use a similar approach to the one used in the breakLeaves function
// }
