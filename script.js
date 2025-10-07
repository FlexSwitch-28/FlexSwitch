

    
function RgbRand(){
   let list = []
   
    for(i = 0; i < 3; i++){
      rand = Math.random() * 256
      
      list.push(rand)
    }
 
   rgb = "rgb("+ list[0] +","+ list[1] + "," + list[2] + ")"
   console.log(rgb)
   return rgb
}





const p = document.getElementById("2")
p.innerText = "hell2a"
p.style.color = RgbRand()


    
    
