// Requisição de pacotes necessários para o funcionamento do bot
// Pacotes previamente instalados pelo CMD
const discord = require('discord.js');
const ytdl = require('ytdl-core');
const yt = require('simple-youtube-api');

// Referênciação dsa chaves de acesso às API's utilizadas
const {dToken, gToken} = require('./config.js');

// Criação dos objetos referentes aos serviços ativos que serão utilizados
const client = new discord.Client();
const youtube = new yt(gToken);

// Variável que checa se o bot está online no canal de voz
let pronto = false;

// Variável para flexibilizar a chave de chamada dos comandos
const comando = '!';

// Fila para armazenamento das músicas
const fila = [];

// Devolve no servidor quando o bot fica online
client.on('ready', () => {
    console.log('Tô na área!')
});

// Variável para estabelecer a coneção do bot com o canal de voz
let connection;

// Função principal de inicio do bot, assincrona
client.on('message', async (msg) => {

        //Verifica a condicional e caso todas sejam verdadeiras, loga o bot no canal de voz
        if(msg.content===`${comando}join` && msg.member.voice.channel && !msg.author.bot){

            // Atribuí o comando de conexão ao canal para o bot
            connection = await msg.member.voice.channel.join();

            // Entra com o bot no canal e após realiza uma ação
            msg.member.voice.channel.join().then(connection =>{
                pronto = true;
                msg.channel.send('Fica longe desse ambiente de música!', {tts: true})
                // connection.play('./sound/);
            });
        };
        //Verifica a condicional e caso todas sejam verdadeiras, retira o bot do canal de voz
        if(msg.content===`${comando}leave` && msg.member.voice.channel && !msg.author.bot){
            msg.member.voice.channel.leave();
            pronto = false;
        };

        // Comandos do player de música

        // Play = Executa a música desejada por meio de link ou busca
        if(msg.content.startsWith(`${comando}play `)){

            // Verifica se o bot está online no canal de voz
            if(pronto){

                // Substitui o comando digitado deixando somente o elemento desejado da busca ou link
                let tocar = msg.content.replace(`${comando}play `, '');

                // Verifica a execução da música deve ser por link ou por meio de busca
                try{

                    // Recebe o link digitado
                    let audio = await youtube.getVideo(tocar);

                    // Retorna somente o titulo do vídeo refente ao link
                    msg.channel.send(`${audio.title}`)

                    // Testa se o link digitado é válido
                    if(ytdl.validateURL(tocar)){
                        
                        // Armazena o link na fila de execução
                        fila.push(tocar);

                        // Chama a função de execução da fila, caso a fila possua somente 1 elemento
                        if(fila.length === 1){
                            musica(msg);
                        };

                      // Caso o link seja inválido retorna a mensagem no servidor 
                    } else {
                        msg.channel.send('Link inválido!!!')
                    };
                  // Caso o que for digitado não seja um link válido, entra no bloco abaixo 
                } catch (error){
                    try {

                        // Pesquisa o termo desejado e retorna 1 resultado
                        let pesquisa = await youtube.searchVideos(tocar,1);

                        // Armazena o ID do vídeo encontrado
                        let encontrado = await youtube.getVideoByID(pesquisa[0].id);

                        // Armazena na variavel o link de busca genérico com o ID de vídeo encontrado
                        const msc = (`https://www.youtube.com/watch?v=${encontrado.id}`);

                        // Retorna o titulo da música a ser tocada
                        msg.channel.send(`Vou tocar: ${encontrado.title}`);

                        // Armazena o link da fila de execução
                        fila.push(msc);

                        // Chama a função de execução da fila, caso a fila possua somente 1 elemento
                        if(fila.length === 1){
                            musica(msg);
                        };
                     // Retorna a mensagem caso nada seja encontrado 
                    } catch (error2){
                        msg.channel.send('Nenhum video foi encontrado!')
                    };
                };
            };
        };

        // Pause = Pausa a música
        if(msg.content === `${comando}pause`){
            if(msg.member.voice.channel){
                if(connection.dispatcher){
                    if(!connection.dispatcher.paused){
                        connection.dispatcher.pause();
                    } else {
                        msg.channel.send('Eu já estou pausado!')
                    };
                } else {
                    msg.channel.send('Eu não estou tocando nada!')
                };
            };
        };

        // Resume = Retoma a música do momento atual
        if(msg.content === `${comando}resume`){
            if(msg.member.voice.channel){
                if(connection.dispatcher){
                    if(connection.dispatcher.paused){
                        connection.dispatcher.resume();
                    } else {
                        msg.channel.send('Eu não estou pausado!')
                    };
                } else {
                    msg.channel.send('Eu já estou tocando!')
                };
            };
        };

        // End = Finaliza a execução de toda a fila
        if(msg.content === `${comando}end`){
            if(msg.member.voice.channel){
                if(connection.dispatcher){
                    connection.dispatcher.end();
                    
                    while(fila.length > 0){
                        fila.shift();
                    };
                }else {
                    msg.channel.send('Não estou tocando nada!')
                };
            };
        };

        // Skip = Passa para a próxima música da fila
        if(msg.content === `${comando}skip`){
            if(msg.member.voice.channel){
                if(connection.dispatcher){

                    if(fila.length > 1){
                    connection.dispatcher.end();
                    }else {
                        msg.channel.send('Não existem mais itens na lista!')
                    };
                   
                }else {
                    msg.channel.send('Não estou tocando nada!')
                };
            };
        };

});

// Função que executa a fila de músicas e atualiza a fila conforme a música atual termina
function musica(msg){
    const disp = connection.play(ytdl(fila[0], {quality: 'highestaudio', highWaterMark: 1<<25}), {highWaterMark: 1}, {bitrate: 192000});

    // Ação no evento de fim da música atual
    disp.on('finish', () => {

        // Retira o item atual da fila e coloca o próximo na posição
        fila.shift();

        // Chama novamente a função caso ainda existam elementos na fila
        if(fila.length >= 1){
            musica(msg);
        };
    });
};
// Ação de login do bot ao servidor
client.login(dToken);