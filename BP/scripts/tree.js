import { ItemStack, system, world, Block as B } from "@minecraft/server";
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

			if (Block.isBeta(path.above(), this.leaf, this.leafPermutation))
				this.validation.up = true;
			if (Block.isBeta(path.north(), this.leaf, this.leafPermutation))
				this.validation.north = true;
			if (Block.isBeta(path.south(), this.leaf, this.leafPermutation))
				this.validation.south = true;
			if (Block.isBeta(path.east(), this.leaf, this.leafPermutation))
				this.validation.east = true;
			if (Block.isBeta(path.west(), this.leaf, this.leafPermutation))
				this.validation.west = true;

			if (
				Block.isBeta(path.above(), this.wood) &&
				!visited.has(JSON.stringify(path.above().location))
			) {
				stack.push(path.above());
				visited.add(JSON.stringify(path.above().location));
			}
			Vector.offsetList.forEach((location) => {
				let offset = path.offset(location);
				if (
					Block.isBeta(offset, this.wood) &&
					!visited.has(JSON.stringify(offset.location))
				) {
					stack.push(offset);
					visited.add(JSON.stringify(offset.location));
				}
				if (
					Block.isBeta(offset.above(), this.wood) &&
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
		system.run(() => this.breakLogs());
		system.run(() => {
			this.getLeavesBeta2();
			// this.getLeavesBeta();
			let logItem = new ItemStack(this.wood);
			let logs = Array.from(this.logs);
			// let leaves = Array.from(this.leaves);
			// let leafCutInterval = system.runInterval(() => {
			// 	let end = async () => {
			// 		Block.destroy(
			// 			this.strToLocation(leaves.pop()),
			// 			this.dimension
			// 		);
			// 		this.source.runCommandAsync(
			// 			`loot spawn ${this.source.location.x} ${this.source.location.y} ${this.source.location.z} loot "blocks/${this.type}_leaf" mainhand`
			// 		);
			// 	};
			// 	if (leaves.length > 3) {
			// 		end();
			// 		end();
			// 		end();
			// 	} else if (leaves.length > 0) end();
			// 	else system.clearRun(leafCutInterval);
			// }, 1);
			system.runTimeout(() => {
				let logCutInterval = system.runInterval(() => {
					if (logs.length > 0) {
						const location = this.strToLocation(logs.shift());
						Block.destroy(location, this.dimension);
						this.dimension.spawnItem(logItem, this.source.location);
						world.playSound("dig.wood", location);
					} else {
						this.source.setDynamicProperty("cutting", false);
						system.clearRun(logCutInterval);
					}
				});
			});
		});
	}
	breakLogs() {
		let stack = [];
		stack.push(this.origin);

		while (stack.length > 0) {
			let path = stack.pop();
			let location = Object.values(path.location).join(",");
			if (
				!this.logs.has(location) &&
				Math.abs(path.location.x) - Math.abs(this.origin.x) < 8 &&
				Math.abs(path.location.z) - Math.abs(this.origin.z) < 8
			) {
				this.logs.add(location);
				Vector.offsetList.forEach((loc) => {
					let offset = path.offset(loc);
					if (Block.isBeta(offset, this.wood)) stack.push(offset);
				});
			}
		}
	}

	async getLeavesBeta2() {
		let stack = Array.from(this.logs);
		let visited = new Set();
		let batch = [];
		const MAX_BATCH_SIZE = 27;
		while (stack.length > 0) {
			let strLocation = stack.pop();
			let location = this.strToLocation(strLocation);
			if (!visited.has(strLocation)) {
				visited.add(strLocation);
				let block = this.dimension.getBlock(location);
				if (Block.isBeta(block, this.leaf, this.leafPermutation)) {
					if (batch.length < MAX_BATCH_SIZE) batch.push(location);
					else {
						batch.push(location);
						await this.breakLeaves(batch);
					}
				}

				let hasForeignLog = Vector.getProximity(2).some((loc) => {
					let offset = block.offset(loc);
					if (
						Block.isBeta(offset, this.wood) &&
						!this.logs.has(this.locationToStr(offset.location))
					)
						return true;
					else return false;
				});
				if (!hasForeignLog) {
					Vector.offsetList.forEach((loc) => {
						let offset = block.offset(loc);
						let strOffset = this.locationToStr(offset.location);
						if (
							Block.isBeta(
								offset,
								this.leaf,
								this.leafPermutation
							) &&
							!visited.has(strOffset)
						) {
							stack.push(strOffset);
						}
					});
				}
			}
		}
		if (batch.length > 0) this.breakLeaves(batch);
	}
	async breakLeaves(batch) {
		system.run(() => {
			while (batch.length > 0) {
				let location = batch.pop();
				Block.destroy(location, this.dimension);
				this.source.runCommandAsync(
					`loot spawn ~ ~ ~ loot "blocks/${this.type}_leaves" mainhand`
				);
			}
		});
	}

	getLeaves() {
		let queue = Array.from(this.logs);
		let foreign = new Set();
		let newLeaves = new Set();
		let upperVicinity = Vector.offsetList;
		upperVicinity.unshift({ x: 0, y: 0, z: 0 });

		while (queue.length > 0) {
			let block = this.dimension.getBlock(JSON.parse(queue.shift()));
			let leaf = JSON.stringify(block.location);
			Vector.offsetList.forEach((location) => {
				let offset = block.offset(location);
				if (Block.is(offset, this.leaf, this.leafPermutation)) {
					leaf = JSON.stringify(offset.location);
					if (!this.leaves.has(leaf)) {
						this.leaves.add(leaf);
						queue.push(leaf);
					}
				} else if (
					Block.is(offset, this.wood) &&
					!this.logs.has(JSON.stringify(offset.location))
				) {
					foreign.add(JSON.stringify(block.location));
				}
			});
		}

		this.leaves.forEach((value) => {
			if (!foreign.has(value)) newLeaves.add(value);
		});
		this.leaves = newLeaves;
	}

	//This was written using the Beta API 1.8.0-beta because using block permutations are very slow
	getLeavesBeta() {
		let queue = Array.from(this.logs);
		let foreign = new Set();
		let newLeaves = new Set();
		let upperVicinity = Vector.offsetList;
		upperVicinity.unshift({ x: 0, y: 0, z: 0 });

		while (queue.length > 0) {
			let leaf = queue.pop();
			let block = this.dimension.getBlock(this.strToLocation(leaf));
			Vector.offsetList.forEach((location) => {
				let offset = block.offset(location);
				if (Block.isBeta(offset, this.leaf, this.leafPermutation)) {
					leaf = this.locationToStr(offset.location);
					if (!this.leaves.has(leaf)) {
						this.leaves.add(leaf);
						queue.push(leaf);
					}
				} else if (
					Block.isBeta(offset, this.wood) &&
					!this.logs.has(this.locationToStr(offset.location))
				) {
					foreign.add(this.locationToStr(block.location));
				}
			});
			if (
				Block.isBeta(block, this.leaf, this.leafPermutation) &&
				Block.isBeta(block.below(), this.wood) &&
				!this.logs.has(this.locationToStr(block.below().location))
			)
				foreign.add(this.locationToStr(block.location));
		}

		this.leaves.forEach((value) => {
			if (!foreign.has(value)) newLeaves.add(value);
		});
		this.leaves = newLeaves;
	}

	strToLocation(string) {
		const strLocation = string.split(",").map((point) => Number(point));
		return {
			x: strLocation[0],
			y: strLocation[1],
			z: strLocation[2],
		};
	}

	locationToStr(location) {
		return Object.values(location).join(",");
	}
}

export default Tree;
