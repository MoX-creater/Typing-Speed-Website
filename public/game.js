const content = `Batman is a hero who protects Gotham City. After losing his parents, he trains hard to fight crime. He uses his intelligence, strength, and gadgets to stop villains like the Joker and the Riddler. With the help of Alfred and Commissioner Gordon, he keeps the city safe. Though he has no superpowers, his courage and determination make him a true hero.`.split(" ");
const contentLength = content.length;
const gameTime = 30*1000;
window.timer = null;

// document.getElementById("content").innerHTML = content;

// const refreshButton = document

function randomWord(){
    const randomIndex = Math.floor(Math.random()*contentLength);
    return content[randomIndex];
}

function addClass(el,name){
    el.className += ' ' + name;
}

function removeClass(el,name){
    el.className = el.className.replace(name,'');
}

function wordFormat(content){
    // return `<div class=words><span class="letters">${content.split('').join(</span><span class="letters")>}</span></div>`;
    return `<div class="word"><span class="letter">${content.split('').join('</span><span class="letter">')}</span></div>`;
}

function newGame(){
    document.getElementById("content").innerHTML = '';
    for (let i = 0; i < 200; i++) {
        document.getElementById("content").innerHTML += wordFormat(randomWord());        
    }
    addClass(document.querySelector('.word'),'current');
    addClass(document.querySelector('.letter'),'current');
    document.getElementById('timer').innerHTML = gameTime / 1000;
    window.timer = null;    
}

function getWpm() {
    const word = [...document.querySelectorAll('.word')];
    const lastTypedWord = document.querySelector('.word.current');
    const lastTypedWordIndex = word.indexOf(lastTypedWord) + 1;
    const typedWords = word.slice(0, lastTypedWordIndex);
    const correctWords = typedWords.filter(word => {
      const letters = [...word.children];
      const incorrectLetters = letters.filter(letter => letter.className.includes('incorrect'));
      const correctLetters = letters.filter(letter => letter.className.includes('correct'));
      return incorrectLetters.length === 0 && correctLetters.length === letters.length;
    });
    return correctWords.length / gameTime * 60000;
}

function gameOver() {
    clearInterval(window.timer);
    addClass(document.getElementById('game'), 'over');
    const result = getWpm();
    document.getElementById('timer').innerHTML = `WPM: ${result}`;
}


document.getElementById("game").addEventListener("keyup", ev => {
    const key = ev.key;
    const currentLetter = document.querySelector('.letter.current');
    const currentWord = document.querySelector('.word.current');
    const expected = currentLetter?.innerHTML || ' ';
    console.log({key,expected});

    const isLetter = key.length === 1 && key !==' ';
    const isSpace = key===' ';
    const isBackspace = key=== 'Backspace';
    const isFirstLetter = currentLetter === currentWord.firstChild;
    
    if(document.querySelector('#game.over')){
        return;
    }
    if (!window.timer && isLetter) {
        // window.timer = setInterval(()=>{
        //     if (!window.gameStart) {
        //         window.gameStart = (new Date()).getTime();
        //     }
        //     const currentTime = (new Date()).getTime();
        //     const msPassed = currentTime - window.gameStart;
        //     document.getElementById('timer').innerHTML = msPassed + '';
        // },1000);
        
        window.timer = setInterval(() => {
          if (!window.gameStart) {
            window.gameStart = (new Date()).getTime();
          }
          const currentTime = (new Date()).getTime();
          const msPassed = currentTime - window.gameStart;
          const sPassed = Math.round(msPassed / 1000);
          const sLeft = Math.round((gameTime / 1000) - sPassed);
          if (sLeft <= 0) {
            gameOver();
            return;
          }
          document.getElementById('timer').innerHTML = sLeft + '';
        }, 1000);
    }
    
    if(isLetter){
        // alert(key === expected ? "right" : "wrong");
        if(currentLetter){
            addClass(currentLetter,key===expected ? 'correct':'incorrect');
            removeClass(currentLetter,'current');
            if(currentLetter.nextSibling){
                addClass(currentLetter.nextSibling,'current');
            }
        }else {
            const incorrectLetter = document.createElement('span');
            incorrectLetter.innerHTML = key;
            incorrectLetter.className = 'letter incorrect extra';
            currentWord.appendChild(incorrectLetter);
        }
    }

    if(isSpace){
        if(expected !==' '){
            const lettersToInvalidate = [...document.querySelectorAll('.word.current .letter:not(.correct)')];
            lettersToInvalidate.forEach(letter =>{
                addClass(letter,'incorrect');
            });
        }
        removeClass(currentWord,'current');
        addClass(currentWord.nextSibling,'current');
        if(currentLetter){
            removeClass(currentLetter,'current');
        };
        addClass(currentWord.nextSibling.firstChild,'current');
    }

    if (isBackspace) {
        if (currentLetter && isFirstLetter) {
            // make prev word current, last letter current
            removeClass(currentWord, 'current');
            addClass(currentWord.previousSibling, 'current');
            removeClass(currentLetter, 'current');
            addClass(currentWord.previousSibling.lastChild, 'current');
            removeClass(currentWord.previousSibling.lastChild, 'incorrect');
            removeClass(currentWord.previousSibling.lastChild, 'correct');
        }
        if (currentLetter && !isFirstLetter) {
            // move back one letter, invalidate letter
            removeClass(currentLetter, 'current');
            addClass(currentLetter.previousSibling, 'current');
            removeClass(currentLetter.previousSibling, 'incorrect');
            removeClass(currentLetter.previousSibling, 'correct');
        }
        if (!currentLetter) {
            addClass(currentWord.lastChild, 'current');
            removeClass(currentWord.lastChild, 'incorrect');
            removeClass(currentWord.lastChild, 'correct');
        }    
    }

    if(currentWord.getBoundingClientRect().top > 300){
        const words = document.getElementById('content');
        const margin = parseInt(words.style.marginTop || '0px');
        words.style.marginTop = (margin - 45) + "px";
    }

    //cursor move
    const nextLetter = document.querySelector('.letter.current');
    const nextWord = document.querySelector('.word.current');
    const cursor = document.getElementById('cursor');
    cursor.style.top = (nextLetter || nextWord).getBoundingClientRect().top + 2 + 'px';
    cursor.style.left = (nextLetter || nextWord).getBoundingClientRect()[nextLetter ? 'left' : 'right'] + 'px';

})



document.getElementById('button').addEventListener('click', ()=>{
    if(true){
        gameOver();
        newGame();
    };
})

newGame();

