var fs = require("fs");

let qs = JSON.parse(fs.readFileSync("categories.json", "utf-8"));


for(key in qs) {
    qs[key].forEach((clue,i) => {
        if(clue.value == null){
            qs[key].splice(i, 1);
        } else {
            clue.value = +clue.value.match(/[0-9]/gm).join("");
        }
    })
}

fs.writeFileSync("categories2.json", JSON.stringify(qs), {encoding: "utf-8"});