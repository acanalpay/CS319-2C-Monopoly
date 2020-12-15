class CityModel extends PropertyModel {

    constructor(id, name, rentPrice, mortgagePrice, price, tile, card, isMortgaged, houseCost, hotelCost, buildings, cityGroup) {
        super(id, name, rentPrice, mortgagePrice, price, tile, card, isMortgaged);
        this.houseCost = houseCost;
        this.hotelCost = hotelCost;
        this.buildings = buildings;
        this.cityGroup = cityGroup;
        this.houseCount = 0;
        this.hotelCount = 0;
    }

    /**
     *
     * @param newBuilding: Building
     * @returns {boolean}
     */
    setBuildings(newBuilding) {
        //check if all cities in the same color group belong to the same player.
        for (let i = 0; i < this.cityGroup.length; i++) {
            if (this.ownerId != this.cityGroup[i].ownerId) {
                return false;
            }
        }

        //if hotel is to be erected
        if (newBuilding.type.localeCompare('hotel')) {
            //cannot erect a hotel if there are not 4 houses
            if (this.houseCount != 4) {
                return false;
            }

            //only one hotel can be built
            if (this.hotelCount == 1) {
                return false;
            }

            //hotel can be built if all cities in that color group have 4 houses.
            //also cannot build hotel if any of the cities is mortgaged.
            for (let i = 0; i < this.cityGroup.length; i++) {
                if (this.cityGroup[i].houseCount < 4 || this.cityGroup[i].hotelCount < 1 || this.cityGroup[i].isMortgaged) {
                    return false;
                }
            }
            //build the hotel
            this.buildings = null;
            this.buildings = [newBuilding];
            this.houseCount = 0;
            this.hotelCount = 1;
            return true;
        }
        else {
            //cannot erect house if there are already 4 of them
            if (this.houseCount == 4)  {
                return false;
            }

            //cannot erect nth house if there are no n-1 houses in all cities in the same city group
            let flag = true;
            let count = this.houseCount;
            for (let j = 0; j < this.cityGroup.length; j++) {
                if (this.cityGroup[j].houseCount < count) {
                    flag = false;
                }
            }

            if (flag) {
                //build the house
                this.buildings.push(newBuilding);
                this.houseCount += 1;
                return true;
            }
        }
        return false;
    }

    /**
     *
     * @param buildingType: string
     * @returns {boolean}
     */
    sellBuilding(buildingType) {
        if (!(buildingType.localeCompare('hotel')) || !(buildingType.localeCompare('house'))) {
            return false;
        }

        //if no building, nothing to sell.
        if (this.hotelCount == 0 || this.houseCount == 0) {
            return false;
        }

        //if hotel, sell directly.
        if (buildingType.localeCompare('hotel')) {
            this.buildings = null;
            this.hotelCount = 0;
            return true;
        }
        else if (buildingType.localeCompare('house')) {

            //you must break down evenly, meaning that you cannot sell from this property,
            //if other one of cities have one more house. i.e., if this property has 3, and other has 4, you have to sell from the other.
            for (let i = 0; i < this.cityGroup.length; i++) {
                 if (this.cityGroup[i].houseCount > this.houseCount) {
                     return false;
                 }
            }
            this.buildings.pop();
            this.houseCount -= 1;
            return true;
        }
        return false;
    }

    /**
     *  //below shows the rents of city for different combinations:
        //0 house -> rentPrice[0]
        //1 house -> rentPrice[1]
        //2 houses -> rentPrice[2]
        //3 houses -> rentPrice[3]
        //4 houses -> rentPrice[4]
        //1 hotel -> rentPrice[5]
     * @returns {number|*}
     */
    getRentPrice() {
        if (this.isMortgaged) {
            return 0;
        }

        //if all cities in the same color group are owned, rent is doubled
        let double = true;
        if (this.ownerId != null) {
            for (let j = 0;  j < this.cityGroup.length; j++) {
                if (this.cityGroup[j].ownerId != this.ownerId) {
                    double = false;
                }
            }
        }

        //double the rent price
        if (double) {
            this.rentPrice[0] *= 2
        }

        //index 5 means that, the property has 4 houses and 1 hotels.
        //max number of houses is 4.
        let index = this.houseCount + this.hotelCount * 5;
        return super.getRentPrice() + this.rentPrice[index];
    }

    mortgage() {
        super.mortgage();
        //money that goes to the player.
        let addedMoney = (this.houseCount * this.houseCost) / 2 + (this.hotelCount * this.hotelCost) / 2;
        this.hotelCount = 0;
        this.houseCount = 0;
        this.buildings = null;
    }
}