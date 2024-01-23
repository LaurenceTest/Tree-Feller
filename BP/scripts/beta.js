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
		{ x: 0, y: 1, z: 0 },
		{ x: 1, y: 1, z: 0 },
		{ x: 1, y: 1, z: 1 },
		{ x: 0, y: 1, z: 1 },
		{ x: -1, y: 1, z: 1 },
		{ x: -1, y: 1, z: 0 },
		{ x: -1, y: 1, z: -1 },
		{ x: 0, y: 1, z: -1 },
		{ x: 1, y: 1, z: -1 },
	];
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	static add(vector1, vector2) {
		return {
			x: vector1.x + vector2.x,
			y: vector1.y + vector2.y,
			z: vector1.z + vector2.z,
		};
	}
	equals(vector) {
		return (
			this.x === vector.x && this.y === vector.y && this.z === vector.z
		);
	}
	static taxicab(vector1, vector2) {
		return (
			Math.abs(vector1.x) -
			Math.abs(vector2.x) +
			(Math.abs(vector1.y) - Math.abs(vector2.y)) +
			(Math.abs(vector1.z) - Math.abs(vector2.z))
		);
	}
	//this is stressing me the hell out
	static getProximity(radius = 1) {
		let offset = [];
		for (let x = -radius; x <= radius; x++) {
			for (let y = -radius; y <= radius; y++) {
				for (let z = -radius; z <= radius; z++) {
					offset.push({
						x: x,
						y: y,
						z: z,
					});
				}
			}
		}
		return offset;
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
	static isBeta(block, blockName, permutation) {
		let permTruth = true;
		if (permutation)
			Object.entries(permutation).forEach(([key, value]) => {
				if (block.permutation.getState(key) !== value)
					permTruth = false;
			});
		return block.typeId === `minecraft:${blockName}` && permTruth;
	}
	static equals(block1, block2) {
		return new Vector(block1.location).equals(block2.location);
	}
}
