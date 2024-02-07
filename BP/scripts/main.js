import { world } from "@minecraft/server";
import Tree from "./tree";

const breakBlockEvent = world.afterEvents.playerBreakBlock;
const axes = [
	"wooden_axe",
	"stone_axe",
	"iron_axe",
	"golden_axe",
	"diamond_axe",
	"netherite_axe",
];

Tree.woodTypes.forEach((wood) => {
	breakBlockEvent.subscribe(
		({ block, itemStackAfterBreak, player }) => {
			if (
				axes.some(
					(axe) => `minecraft:${axe}` === itemStackAfterBreak.typeId
				) &&
				player.isSneaking
			) {
				const tree = new Tree(wood, block, player, itemStackAfterBreak);
				tree.validate();
				player.setDynamicProperty("cutting", false);
				if (tree.valid && !player.getDynamicProperty("cutting")) {
					console.log("tree valid");
					player.setDynamicProperty("cutting", true);
					tree.breakTree();
				}
			}
		},
		{ blockTypes: [wood + "_log"] }
	);
});
