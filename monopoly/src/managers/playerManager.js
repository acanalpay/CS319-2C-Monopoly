const PlayerModel = require("../models/playerModel");

class PlayerManager{
    constructor() {
        this.players = {};
    }
    getPlayers(){
        return this.players;
    }
    createPlayers(newPlayerList){
        this.players = {};
        newPlayerList.forEach((newPlayer)=>{
            let playerModel = new PlayerModel(newPlayer.id, newPlayer.username, null, null, 0);
            this.players[playerModel.id] = playerModel;
        });
    }

    getMoney(playerId){
        return this.players[playerId].money;
    }

    /**
     *
     * @param playerId: id of the player moves
     * @param newTile: new tile that the player goes
     * @param startBonus: boolean
     */
    move(playerId, newTile, startBonus) {
        this.players[playerId].move(newTile, startBonus);
    }

    setMoney(playerId, amount){
        if(amount < 0 && !this.isMoneyEnough(playerId, amount))
            return false;
        this.players[playerId].money += amount;
        return true;
    }

    isMoneyEnough(playerId, amount){
        return this.players[playerId].money >= -amount;
    }

    /**
     * @param {int} playerId: Buyers ID
     * @param {PropertyModel} newProperty: PropertyModel Add to the player's properties
     * In the addProperty function, the owner of the newProperty is also updated
     */
    addProperty(playerId, newProperty){
        if(this.setMoney(playerId, -newProperty.price)){
            console.log("addProperty removed money");
            newProperty.setOwner(playerId);
            this.players[playerId].properties.push(newProperty);
            console.log("addProperty added property");
            return true;
        }else{
            console.log("addProperty no money");
            return false;
        }
    }

    removeProperty(playerId, removedProperty){
        removedProperty.setOwner(null);
        this.players[playerId].properties.filter((property)=>property.id !== removedProperty.id);
    }


    /**
     * @param {int} playerID
     * @param {CityModel} property
     * @param {BuildingModel} newBuilding: Building
     * @returns {boolean}
     */
    setBuildings(playerID, property, newBuilding) {

        let player = this.players[playerID];

        let cost = newBuilding.cost;

        let playerProperty = player.properties.find(myp => myp.id === property.id);//Why can't access parent's variable

        if(!this.isMoneyEnough(playerID, -cost))
            return false;

        //check if all cities in the same color group belong to the same player.
        playerProperty.cityGroup.forEach(city => {
            if(city.ownerId !== playerID)
                return false;
        });


        //if hotel is to be erected
        if (newBuilding.type === 'hotel') {
            //cannot erect a hotel if there are not 4 houses
            if (playerProperty.houseCount !== 4)
                return false;


            //only one hotel can be built
            if (playerProperty.hotelCount === 1)
                return false;


            //hotel can be built if all cities in that color group have 4 houses.
            //also cannot build hotel if any of the cities is mortgaged.
            for (let i = 0; i < playerProperty.cityGroup.getCityCount(); i++)
                if (playerProperty.cityGroup[i].houseCount < 4
                    || playerProperty.cityGroup[i].hotelCount < 1 || playerProperty.cityGroup[i].isMortgaged)
                    return false;

            //build the hotel
            playerProperty.buildings = null;
            playerProperty.buildings = [newBuilding];
            playerProperty.houseCount = 0;
            playerProperty.hotelCount = 1;
            this.setMoney(playerID, -cost);
            return true;
        }
        else {
            //cannot erect house if there are already 4 of them
            if (playerProperty.houseCount === 4)
                return false;


            //cannot erect nth house if there are no n-1 houses in all cities in the same city group
            let flag = true;
            let count = playerProperty.houseCount;
            for (let j = 0; j < playerProperty.cityGroup.getCityCount(); j++)
                if (playerProperty.cityGroup[j].houseCount < count)
                    flag = false;



            if (flag) {
                //build the house
                playerProperty.buildings.push(newBuilding);
                playerProperty.houseCount += 1;
                this.setMoney(playerID, -cost);
                return true;
            }
        }
        return false;
    }

    /**
     * Used to sell one of players buildings to bank
     * @param playerId: id of the player
     * @param property: property in which the building is to be removed
     * @param building: building to be removed
     * @returns {boolean}
     */
    sellBuilding(playerId, property, building) {
        let player = this.players[playerID];

        let cost = building.cost;

        let playerProperty = player.properties.find(myp => myp.id === property.id);//Why can't access parent's variable

        let houses = playerProperty.houseCount;
        let hotels = playerProperty.hotelCount;

        //player is selling a hotel to the bank
        if (building.type === 'hotel') {
            if (hotels == 1) {
                playerProperty.hotelCount = 0;
                playerProperty.buildings = [];
                this.setMoney(playerId, cost);
                return true;
            }
            return false;
        }

        //player is selling a house to the bank
        if (building.type === 'house') {
            if (houses === 0) {
                return false;
            }
            let flag = true;
            for (let j = 0; j < playerProperty.cityGroup.getCityCount(); j++) {
                if (playerProperty.cityGroup[j].houseCount > houses) {
                    flag = false;
                }
            }

            //remove the house if flag.
            if (flag) {
                this.setMoney(playerId, cost);
                playerProperty.houseCount -= 1;
                playerProperty.buildings.remove();
                return true;
            }
        }
        return false;
    }
}

module.exports = new PlayerManager();
