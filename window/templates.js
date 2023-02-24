function slide(diapo, index) {
    return `<div class="row">
        <span class="num-diapo">${index + 1}</span>
        <div class="slide ${index === 0 ? 'border' : ''}" id="${index}" onClick="slideClick(this.id)">
           ${diapo}
        </div>
    </div>
    `
}

module.exports = {
    slide : slide,
}