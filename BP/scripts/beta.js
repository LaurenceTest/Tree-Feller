import { BlockPermutation, world } from "@minecraft/server";

export class Vector {
	static offsetList = [
		{ x: 1, y: 0, z: 0 },
		{ x: 1, y: 0, z: 1 },
		{ x: 0, y: 0, z: 1 },
		{ x: -1, y: 0, z: 1 },
		{ x: -1, y: 0, z: 0 },
		{ x: -1, y: 0, z: -1 },
		{ x: 0, y: 0, z: -1 },
		{ x: 1, y: 0, z: -1 },
	];
	static offset = {
		north: { x: 1, y: 0, z: 0 },
		north_east: { x: 1, y: 0, z: 1 },
		east: { x: 0, y: 0, z: 1 },
		south_east: { x: -1, y: 0, z: 1 },
		south: { x: -1, y: 0, z: 0 },
		south_west: { x: -1, y: 0, z: -1 },
		west: { x: 0, y: 0, z: -1 },
		north_west: { x: 1, y: 0, z: -1 },
	};
	constructor(x, y, z) {
		try {
			if (x.x && x.y && x.z) {
				this.x = x.x;
				this.y = x.y;
				this.z = x.z;
			} else if (!x || !y || !z) throw Error("Incomplete parameters");
			this.x = x;
			this.y = y;
			this.z = z;
		} catch (error) {
			console.error(error);
		}
	}
	add(vector) {
		return {
			x: this.x + vector.x,
			y: this.y + vector.y,
			z: this.z + vector.z,
		};
	}
	equals(vector) {
		return (
			this.x === vector.x && this.y === vector.y && this.z === vector.z
		);
	}
	taxicab(vector) {
		return this.x - vector.x - (this.y - vector.y) - (this.z - vector.z);
	}
}

export class Block {
	static set(location, block, dimension) {
		dimension = dimension ?? "overworld";
		world
			.getDimension(dimension)
			.getBlock(location)
			.setPermutation(BlockPermutation.resolve(block));
	}
	static replace(block, newBlockName) {
		if (dimension) block = world.getDimension(dimension).getBlock(block);
		block.setPermutation(BlockPermutation.resolve(newBlockName));
	}
	static destroy(block, dimension) {
		if (dimension) block = dimension.getBlock(block);
		block.setPermutation(BlockPermutation.resolve("minecraft:air"));
	}
	static is(block, blockName, permutation) {
		return block.permutation.matches(blockName, permutation);
	}
	static equals(block1, block2) {
		return new Vector(block1.location).equals(block2.location);
	}
}
