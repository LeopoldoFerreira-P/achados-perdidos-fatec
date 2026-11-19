
import React, { useEffect, useState } from 'react';

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

function mostrarMensagem(titulo, mensagem) {
  if (Platform.OS === 'web') {
    globalThis.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

export default function App() {
  const [tela, setTela] = useState('inicio');

  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);

  const [anuncios, setAnuncios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [acaoAnuncioId, setAcaoAnuncioId] = useState(null);

  // Cadastro e login
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Formulário de anúncio
  const [tipoAnuncio, setTipoAnuncio] = useState('perdido');
  const [tituloAnuncio, setTituloAnuncio] = useState('');
  const [descricaoAnuncio, setDescricaoAnuncio] = useState('');
  const [categoriaAnuncio, setCategoriaAnuncio] = useState('Outros');
  const [localAnuncio, setLocalAnuncio] = useState('');
  const [dataAnuncio, setDataAnuncio] = useState('');
  const [contatoAnuncio, setContatoAnuncio] = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState(null);

  // Filtros
  const [pesquisa, setPesquisa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const categorias = [
    'Eletrônicos',
    'Documentos',
    'Material escolar',
    'Roupas e acessórios',
    'Chaves',
    'Outros',
  ];

  // =====================================================
  // CARREGAR ANÚNCIOS
  // =====================================================

  async function carregarAnuncios() {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select(`
          id,
          usuario_id,
          tipo,
          titulo,
          descricao,
          categoria,
          local,
          data_ocorrencia,
          contato,
          foto_path,
          status,
          criado_em
        `)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      setAnuncios(data || []);
    } catch (erro) {
      console.error('Erro ao carregar anúncios:', erro);
      mostrarMensagem('Erro', 'Não foi possível carregar os anúncios.');
    } finally {
      setCarregando(false);
    }
  }

  // =====================================================
  // FILTRAR ANÚNCIOS
  // =====================================================

  const anunciosFiltrados = anuncios.filter((item) => {
    const texto = pesquisa.trim().toLocaleLowerCase('pt-BR');

    const correspondePesquisa =
      !texto ||
      [item.titulo, item.descricao, item.local].some((valor) =>
        (valor || '').toLocaleLowerCase('pt-BR').includes(texto)
      );

    const correspondeTipo =
      filtroTipo === 'todos' || item.tipo === filtroTipo;

    const correspondeCategoria =
      filtroCategoria === 'todas' ||
      item.categoria === filtroCategoria;

    const correspondeStatus =
      filtroStatus === 'todos' || item.status === filtroStatus;

    return (
      correspondePesquisa &&
      correspondeTipo &&
      correspondeCategoria &&
      correspondeStatus
    );
  });

  function limparFiltros() {
    setPesquisa('');
    setFiltroTipo('todos');
    setFiltroCategoria('todas');
    setFiltroStatus('todos');
  }

  // =====================================================
  // CARREGAR PERFIL
  // =====================================================

  async function carregarPerfil(id) {
    if (!id) {
      setPerfil(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, status_aprovacao, papel')
        .eq('id', id)
        .single();

      if (error) throw error;

      setPerfil(data);
      return data;
    } catch (erro) {
      console.error('Erro ao carregar perfil:', erro);
      setPerfil(null);
      return null;
    }
  }

  // =====================================================
  // INICIALIZAÇÃO E SESSÃO
  // =====================================================

  useEffect(() => {
    carregarAnuncios();

    let inscricao;

    async function iniciarSessao() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao recuperar sessão:', error);
      }

      const sessao = data?.session;
      setUsuario(sessao?.user || null);

      if (sessao?.user) {
        await carregarPerfil(sessao.user.id);
      }
    }

    iniciarSessao();

    const resultado = supabase.auth.onAuthStateChange(
      (evento, sessao) => {
        const usuarioAtual = sessao?.user || null;
        setUsuario(usuarioAtual);

        if (usuarioAtual) {
          Promise.resolve().then(() =>
            carregarPerfil(usuarioAtual.id)
          );
        } else {
          setPerfil(null);
        }
      }
    );

    inscricao = resultado.data.subscription;

    return () => {
      inscricao?.unsubscribe();
    };
  }, []);

  // =====================================================
  // CADASTRO
  // =====================================================

  async function cadastrar() {
    if (!nome.trim() || !email.trim() || !senha) {
      mostrarMensagem('Atenção', 'Preencha nome, e-mail e senha.');
      return;
    }

    if (senha.length < 8) {
      mostrarMensagem(
        'Senha inválida',
        'A senha precisa ter pelo menos 8 caracteres.'
      );
      return;
    }

    try {
      setEnviando(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { nome: nome.trim() },
        },
      });

      if (error) throw error;

      if (data.user) {
        setNome('');
        setEmail('');
        setSenha('');
        setTela('login');

        mostrarMensagem(
          'Cadastro realizado',
          'Sua conta foi criada. Aguarde a aprovação do administrador para publicar anúncios.'
        );
      }
    } catch (erro) {
      console.error('Erro no cadastro:', erro);
      mostrarMensagem(
        'Erro no cadastro',
        erro.message || 'Não foi possível criar a conta.'
      );
    } finally {
      setEnviando(false);
    }
  }

  // =====================================================
  // LOGIN
  // =====================================================

  async function entrar() {
    if (!email.trim() || !senha) {
      mostrarMensagem('Atenção', 'Informe e-mail e senha.');
      return;
    }

    try {
      setEnviando(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) throw error;

      setUsuario(data.user);

      const dadosPerfil = await carregarPerfil(data.user.id);

      setSenha('');
      setTela('inicio');

      if (dadosPerfil?.status_aprovacao === 'aprovado') {
        mostrarMensagem('Bem-vindo!', 'Você entrou na sua conta.');
      } else {
        mostrarMensagem(
          'Login realizado',
          'Sua conta ainda não está aprovada para publicar. Você pode consultar os anúncios.'
        );
      }

      await carregarAnuncios();
    } catch (erro) {
      console.error('Erro no login:', erro);
      mostrarMensagem(
        'Erro no login',
        erro.message || 'Não foi possível entrar na conta.'
      );
    } finally {
      setEnviando(false);
    }
  }

  // =====================================================
  // SELECIONAR IMAGEM
  // =====================================================

  async function selecionarImagem() {
    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        mostrarMensagem(
          'Permissão necessária',
          'Permita o acesso à galeria para escolher uma foto.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!resultado.canceled && resultado.assets?.length > 0) {
        const foto = resultado.assets[0];

        if (foto.fileSize && foto.fileSize > 5 * 1024 * 1024) {
          mostrarMensagem(
            'Imagem muito grande',
            'Escolha uma imagem de até 5 MB.'
          );
          return;
        }

        setImagemSelecionada(foto);
      }
    } catch (erro) {
      console.error('Erro ao selecionar imagem:', erro);
      mostrarMensagem('Erro', 'Não foi possível abrir a galeria.');
    }
  }

  // =====================================================
  // ENVIAR IMAGEM AO STORAGE
  // =====================================================

  async function enviarFoto(foto) {
    if (!foto || !usuario) return null;

    setEnviandoImagem(true);

    try {
      const resposta = await fetch(foto.uri);
      const arquivo = await resposta.blob();
      const mimeType = foto.mimeType || 'image/jpeg';

      let extensao = 'jpg';

      if (mimeType === 'image/png') extensao = 'png';
      else if (mimeType === 'image/webp') extensao = 'webp';
      else if (mimeType === 'image/heic') extensao = 'heic';
      else if (foto.fileName?.includes('.')) {
        extensao = foto.fileName.split('.').pop().toLowerCase();
      }

      const caminho = `${usuario.id}/${Date.now()}.${extensao}`;

      const { error } = await supabase.storage
        .from('fotos-anuncios')
        .upload(caminho, arquivo, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) throw error;

      return caminho;
    } catch (erro) {
      console.error('Erro ao enviar foto:', erro);
      throw erro;
    } finally {
      setEnviandoImagem(false);
    }
  }

  // =====================================================
  // PUBLICAR ANÚNCIO
  // =====================================================

  async function publicarAnuncio() {
    if (!usuario) {
      mostrarMensagem('Faça login', 'Entre para publicar um anúncio.');
      setTela('login');
      return;
    }

    if (perfil?.status_aprovacao !== 'aprovado') {
      mostrarMensagem(
        'Conta não aprovada',
        'Somente usuários aprovados podem publicar anúncios.'
      );
      return;
    }

    if (
      !tituloAnuncio.trim() ||
      !descricaoAnuncio.trim() ||
      !categoriaAnuncio.trim() ||
      !localAnuncio.trim() ||
      !dataAnuncio.trim() ||
      !contatoAnuncio.trim()
    ) {
      mostrarMensagem('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    const formatoData = /^\d{4}-\d{2}-\d{2}$/;

    if (!formatoData.test(dataAnuncio.trim())) {
      mostrarMensagem(
        'Data inválida',
        'Use o formato AAAA-MM-DD. Exemplo: 2026-10-29.'
      );
      return;
    }

    const [ano, mes, dia] = dataAnuncio.trim().split('-').map(Number);
    const dataValidada = new Date(Date.UTC(ano, mes - 1, dia));

    if (
      dataValidada.getUTCFullYear() !== ano ||
      dataValidada.getUTCMonth() !== mes - 1 ||
      dataValidada.getUTCDate() !== dia
    ) {
      mostrarMensagem('Data inválida', 'Informe uma data existente.');
      return;
    }

    let caminhoFoto = null;

    try {
      setEnviando(true);

      if (imagemSelecionada) {
        caminhoFoto = await enviarFoto(imagemSelecionada);
      }

      const { error } = await supabase
        .from('anuncios')
        .insert({
          usuario_id: usuario.id,
          tipo: tipoAnuncio,
          titulo: tituloAnuncio.trim(),
          descricao: descricaoAnuncio.trim(),
          categoria: categoriaAnuncio.trim(),
          local: localAnuncio.trim(),
          data_ocorrencia: dataAnuncio.trim(),
          contato: contatoAnuncio.trim(),
          foto_path: caminhoFoto,
          status: 'ativo',
        });

      if (error) {
        if (caminhoFoto) {
          await supabase.storage
            .from('fotos-anuncios')
            .remove([caminhoFoto]);
        }

        throw error;
      }

      setTituloAnuncio('');
      setDescricaoAnuncio('');
      setCategoriaAnuncio('Outros');
      setLocalAnuncio('');
      setDataAnuncio('');
      setContatoAnuncio('');
      setTipoAnuncio('perdido');
      setImagemSelecionada(null);

      await carregarAnuncios();
      setTela('inicio');

      mostrarMensagem(
        'Anúncio publicado',
        'Seu anúncio foi publicado com sucesso!'
      );
    } catch (erro) {
      console.error('Erro ao publicar anúncio:', erro);
      mostrarMensagem(
        'Erro ao publicar',
        erro.message || 'Não foi possível publicar o anúncio.'
      );
    } finally {
      setEnviando(false);
    }
  }

  // =====================================================
  // MARCAR ANÚNCIO COMO RECUPERADO
  // =====================================================

  async function marcarRecuperado(item) {
    if (!usuario || usuario.id !== item.usuario_id) {
      mostrarMensagem(
        'Acesso negado',
        'Somente o autor pode alterar este anúncio.'
      );
      return;
    }

    if (perfil?.status_aprovacao !== 'aprovado') {
      mostrarMensagem(
        'Acesso negado',
        'Sua conta precisa estar aprovada para gerenciar anúncios.'
      );
      return;
    }

    if (item.status === 'recuperado') {
      mostrarMensagem(
        'Anúncio já atualizado',
        'Este anúncio já está marcado como recuperado.'
      );
      return;
    }

    try {
      setAcaoAnuncioId(item.id);

      const { error } = await supabase
        .from('anuncios')
        .update({ status: 'recuperado' })
        .eq('id', item.id)
        .eq('usuario_id', usuario.id);

      if (error) throw error;

      await carregarAnuncios();

      mostrarMensagem(
        'Anúncio atualizado',
        'O anúncio foi marcado como recuperado.'
      );
    } catch (erro) {
      console.error('Erro ao atualizar anúncio:', erro);
      mostrarMensagem(
        'Erro',
        erro.message || 'Não foi possível atualizar o anúncio.'
      );
    } finally {
      setAcaoAnuncioId(null);
    }
  }

  // =====================================================
  // EXCLUIR ANÚNCIO
  // =====================================================

  async function executarExclusao(item) {
    if (!usuario || usuario.id !== item.usuario_id) {
      mostrarMensagem(
        'Acesso negado',
        'Somente o autor pode excluir este anúncio.'
      );
      return;
    }

    if (perfil?.status_aprovacao !== 'aprovado') {
      mostrarMensagem(
        'Acesso negado',
        'Sua conta precisa estar aprovada para gerenciar anúncios.'
      );
      return;
    }

    try {
      setAcaoAnuncioId(item.id);

      // Remove primeiro a foto, se existir.
      if (item.foto_path) {
        const { error: erroFoto } = await supabase.storage
          .from('fotos-anuncios')
          .remove([item.foto_path]);

        if (erroFoto) {
          throw new Error(
            'Não foi possível excluir a foto. O anúncio foi mantido. Verifique as permissões do Storage.'
          );
        }
      }

      // Depois remove o anúncio do banco.
      const { error } = await supabase
        .from('anuncios')
        .delete()
        .eq('id', item.id)
        .eq('usuario_id', usuario.id);

      if (error) throw error;

      await carregarAnuncios();

      mostrarMensagem(
        'Anúncio excluído',
        'O anúncio foi removido permanentemente.'
      );
    } catch (erro) {
      console.error('Erro ao excluir anúncio:', erro);
      mostrarMensagem(
        'Erro ao excluir',
        erro.message || 'Não foi possível excluir o anúncio.'
      );
    } finally {
      setAcaoAnuncioId(null);
    }
  }

  function confirmarExclusao(item) {
    if (!usuario || usuario.id !== item.usuario_id) {
      mostrarMensagem(
        'Acesso negado',
        'Somente o autor pode excluir este anúncio.'
      );
      return;
    }

    const mensagem =
      'Tem certeza de que deseja excluir este anúncio? Essa ação é permanente e não poderá ser desfeita.';

    if (Platform.OS === 'web') {
      const confirmou = globalThis.confirm(mensagem);

      if (confirmou) {
        executarExclusao(item);
      }
    } else {
      Alert.alert(
        'Excluir anúncio',
        mensagem,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => executarExclusao(item),
          },
        ]
      );
    }
  }

  // =====================================================
  // SAIR
  // =====================================================

  async function sair() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUsuario(null);
      setPerfil(null);
      setTela('inicio');

      mostrarMensagem('Sessão encerrada', 'Você saiu da sua conta.');
    } catch (erro) {
      console.error('Erro ao sair:', erro);
      mostrarMensagem('Erro', 'Não foi possível sair da conta.');
    }
  }

  // =====================================================
  // COMPONENTES AUXILIARES
  // =====================================================

  function botao(texto, acao, estilo = {}) {
    return (
      <TouchableOpacity
        style={[styles.botao, estilo]}
        onPress={acao}
        disabled={enviando}
        activeOpacity={0.8}
      >
        <Text style={styles.textoBotao}>{texto}</Text>
      </TouchableOpacity>
    );
  }

  function campo(placeholder, valor, alterar, opcoes = {}) {
    return (
      <TextInput
        style={[
          styles.input,
          opcoes.multiline && styles.inputMultiline,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#777"
        value={valor}
        onChangeText={alterar}
        multiline={opcoes.multiline || false}
        numberOfLines={opcoes.numberOfLines || 1}
        keyboardType={opcoes.keyboardType || 'default'}
        secureTextEntry={opcoes.secureTextEntry || false}
        autoCapitalize={opcoes.autoCapitalize || 'sentences'}
        maxLength={opcoes.maxLength}
      />
    );
  }

  function obterUrlFoto(caminho) {
    if (!caminho) return null;

    const { data } = supabase.storage
      .from('fotos-anuncios')
      .getPublicUrl(caminho);

    return data?.publicUrl || null;
  }

  function opcaoFiltro(texto, selecionado, acao) {
    return (
      <TouchableOpacity
        key={texto}
        style={[
          styles.opcaoFiltro,
          selecionado && styles.opcaoFiltroSelecionada,
        ]}
        onPress={acao}
      >
        <Text
          style={[
            styles.textoOpcaoFiltro,
            selecionado && styles.textoOpcaoFiltroSelecionada,
          ]}
        >
          {texto}
        </Text>
      </TouchableOpacity>
    );
  }

  // =====================================================
  // CARTÃO DO ANÚNCIO
  // =====================================================

  function renderAnuncio({ item }) {
    const urlFoto = obterUrlFoto(item.foto_path);

    const ehAutor =
      usuario &&
      usuario.id === item.usuario_id &&
      perfil?.status_aprovacao === 'aprovado';

    const processandoEsteAnuncio = acaoAnuncioId === item.id;

    return (
      <View style={styles.cartaoAnuncio}>
        <View
          style={[
            styles.etiqueta,
            item.tipo === 'perdido'
              ? styles.etiquetaPerdido
              : styles.etiquetaEncontrado,
          ]}
        >
          <Text style={styles.textoEtiqueta}>
            {item.tipo === 'perdido'
              ? 'OBJETO PERDIDO'
              : 'OBJETO ENCONTRADO'}
          </Text>
        </View>

        <Text style={styles.tituloCartao}>{item.titulo}</Text>

        {urlFoto && (
          <Image
            source={{ uri: urlFoto }}
            style={styles.fotoAnuncio}
            resizeMode="cover"
          />
        )}

        <Text style={styles.descricaoCartao}>{item.descricao}</Text>

        <View style={styles.linhaInformacao}>
          <Text style={styles.rotulo}>Categoria:</Text>
          <Text style={styles.valor}>{item.categoria}</Text>
        </View>

        <View style={styles.linhaInformacao}>
          <Text style={styles.rotulo}>Local:</Text>
          <Text style={styles.valor}>{item.local}</Text>
        </View>

        <View style={styles.linhaInformacao}>
          <Text style={styles.rotulo}>Data:</Text>
          <Text style={styles.valor}>{item.data_ocorrencia}</Text>
        </View>

        <View style={styles.linhaInformacao}>
          <Text style={styles.rotulo}>Contato:</Text>
          <Text style={styles.valor}>{item.contato}</Text>
        </View>

        <View style={styles.linhaInformacao}>
          <Text style={styles.rotulo}>Situação:</Text>
          <Text
            style={[
              styles.valor,
              item.status === 'recuperado'
                ? styles.textoRecuperado
                : styles.textoAtivo,
            ]}
          >
            {item.status === 'recuperado' ? 'Recuperado' : 'Ativo'}
          </Text>
        </View>

        {ehAutor && (
          <View style={styles.areaGerenciamento}>
            <Text style={styles.tituloGerenciamento}>
              Gerenciar meu anúncio
            </Text>

            {item.status === 'ativo' && (
              <TouchableOpacity
                style={[
                  styles.botaoRecuperado,
                  processandoEsteAnuncio && styles.botaoDesativado,
                ]}
                onPress={() => marcarRecuperado(item)}
                disabled={processandoEsteAnuncio || enviando}
              >
                <Text style={styles.textoBotaoRecuperado}>
                  {processandoEsteAnuncio
                    ? 'Atualizando...'
                    : 'Marcar como recuperado'}
                </Text>
              </TouchableOpacity>
            )}

            {item.status === 'recuperado' && (
              <Text style={styles.mensagemRecuperado}>
                Este anúncio já foi marcado como recuperado.
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.botaoExcluir,
                processandoEsteAnuncio && styles.botaoDesativado,
              ]}
              onPress={() => confirmarExclusao(item)}
              disabled={processandoEsteAnuncio || enviando}
            >
              <Text style={styles.textoBotaoExcluir}>
                {processandoEsteAnuncio
                  ? 'Aguarde...'
                  : 'Excluir anúncio'}
              </Text>
            </TouchableOpacity>

            {processandoEsteAnuncio && (
              <ActivityIndicator
                color="#2457C5"
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        )}
      </View>
    );
  }

  // =====================================================
  // CABEÇALHO
  // =====================================================

  function renderCabecalho() {
    return (
      <View style={styles.cabecalho}>
        <View style={styles.cabecalhoTexto}>
          <Text style={styles.nomeAplicativo}>Achados e Perdidos</Text>
          <Text style={styles.subtituloAplicativo}>Fatec</Text>
        </View>

        <View style={styles.acoesCabecalho}>
          {perfil?.status_aprovacao === 'aprovado' && (
            <TouchableOpacity
              style={styles.botaoCabecalho}
              onPress={() => setTela('publicar')}
            >
              <Text style={styles.textoBotaoCabecalho}>+ Publicar</Text>
            </TouchableOpacity>
          )}

          {usuario ? (
            <TouchableOpacity style={styles.botaoSair} onPress={sair}>
              <Text style={styles.textoBotaoSair}>Sair</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.botaoCabecalho}
              onPress={() => setTela('login')}
            >
              <Text style={styles.textoBotaoCabecalho}>Entrar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // =====================================================
  // TELA INICIAL COM FILTROS
  // =====================================================

  function renderInicio() {
    return (
      <View style={styles.conteudo}>
        <FlatList
          data={anunciosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderAnuncio}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.lista}
          ListHeaderComponent={
            <View>
              <View style={styles.boasVindas}>
                <Text style={styles.tituloPrincipal}>
                  Encontre o que perdeu.
                </Text>

                <Text style={styles.textoBoasVindas}>
                  Consulte os objetos perdidos e encontrados na Fatec.
                </Text>

                {!usuario && (
                  <Text style={styles.textoAuxiliar}>
                    Você pode consultar os anúncios sem fazer login.
                  </Text>
                )}
              </View>

              {usuario &&
                perfil?.status_aprovacao === 'pendente' && (
                  <View style={styles.aviso}>
                    <Text style={styles.textoAviso}>
                      Sua conta está aguardando aprovação. Você poderá
                      publicar anúncios após a liberação do administrador.
                    </Text>
                  </View>
                )}

              {usuario &&
                perfil?.status_aprovacao === 'recusado' && (
                  <View style={styles.aviso}>
                    <Text style={styles.textoAviso}>
                      Sua conta não foi aprovada para publicar anúncios.
                      Você ainda pode consultar os objetos.
                    </Text>
                  </View>
                )}

              <View style={styles.cabecalhoFiltros}>
                <Text style={styles.tituloSecao}>
                  Pesquisar anúncios
                </Text>

                <TouchableOpacity onPress={limparFiltros}>
                  <Text style={styles.textoLimpar}>Limpar filtros</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.inputPesquisa}
                placeholder="Buscar por objeto, descrição ou local..."
                placeholderTextColor="#777"
                value={pesquisa}
                onChangeText={setPesquisa}
                autoCapitalize="none"
                returnKeyType="search"
              />

              <Text style={styles.rotuloFiltro}>Tipo de anúncio</Text>

              <View style={styles.linhaFiltros}>
                {opcaoFiltro(
                  'Todos',
                  filtroTipo === 'todos',
                  () => setFiltroTipo('todos')
                )}

                {opcaoFiltro(
                  'Perdidos',
                  filtroTipo === 'perdido',
                  () => setFiltroTipo('perdido')
                )}

                {opcaoFiltro(
                  'Encontrados',
                  filtroTipo === 'encontrado',
                  () => setFiltroTipo('encontrado')
                )}
              </View>

              <Text style={styles.rotuloFiltro}>Categoria</Text>

              <View style={styles.linhaFiltros}>
                {opcaoFiltro(
                  'Todas',
                  filtroCategoria === 'todas',
                  () => setFiltroCategoria('todas')
                )}

                {categorias.map((categoria) =>
                  opcaoFiltro(
                    categoria,
                    filtroCategoria === categoria,
                    () => setFiltroCategoria(categoria)
                  )
                )}
              </View>

              <Text style={styles.rotuloFiltro}>Situação</Text>

              <View style={styles.linhaFiltros}>
                {opcaoFiltro(
                  'Todas',
                  filtroStatus === 'todos',
                  () => setFiltroStatus('todos')
                )}

                {opcaoFiltro(
                  'Ativos',
                  filtroStatus === 'ativo',
                  () => setFiltroStatus('ativo')
                )}

                {opcaoFiltro(
                  'Recuperados',
                  filtroStatus === 'recuperado',
                  () => setFiltroStatus('recuperado')
                )}
              </View>

              <View style={styles.tituloLista}>
                <Text style={styles.tituloSecao}>
                  Anúncios
                </Text>

                <TouchableOpacity onPress={carregarAnuncios}>
                  <Text style={styles.textoAtualizar}>Atualizar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.contagemResultados}>
                {anunciosFiltrados.length === 1
                  ? '1 anúncio encontrado'
                  : `${anunciosFiltrados.length} anúncios encontrados`}
              </Text>

              {carregando && (
                <ActivityIndicator
                  size="large"
                  color="#2457C5"
                  style={styles.carregamento}
                />
              )}
            </View>
          }
          ListEmptyComponent={
            !carregando ? (
              <View style={styles.vazio}>
                <Text style={styles.tituloVazio}>
                  Nenhum anúncio encontrado
                </Text>

                <Text style={styles.textoVazio}>
                  Tente mudar os filtros ou pesquisar por outro termo.
                </Text>

                <TouchableOpacity
                  style={styles.botao}
                  onPress={limparFiltros}
                >
                  <Text style={styles.textoBotao}>
                    Limpar filtros
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // =====================================================
  // TELA DE PUBLICAÇÃO
  // =====================================================

  function renderPublicar() {
    if (!usuario || perfil?.status_aprovacao !== 'aprovado') {
      return (
        <View style={styles.formulario}>
          <Text style={styles.tituloSecao}>
            Publicação indisponível
          </Text>

          <Text style={styles.textoAuxiliar}>
            Você precisa de uma conta aprovada para publicar anúncios.
          </Text>

          {botao('Voltar', () => setTela('inicio'))}
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.formulario}
        contentContainerStyle={styles.formularioConteudo}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.tituloFormulario}>Publicar anúncio</Text>

        <Text style={styles.textoFormulario}>
          Informe os dados do objeto perdido ou encontrado.
        </Text>

        <Text style={styles.rotuloCampo}>Tipo de anúncio</Text>

        <View style={styles.opcoesLinha}>
          {['perdido', 'encontrado'].map((tipo) => (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.opcaoTipo,
                tipoAnuncio === tipo && styles.opcaoSelecionada,
              ]}
              onPress={() => setTipoAnuncio(tipo)}
            >
              <Text
                style={[
                  styles.textoOpcao,
                  tipoAnuncio === tipo && styles.textoOpcaoSelecionada,
                ]}
              >
                {tipo === 'perdido' ? 'Perdi um objeto' : 'Encontrei um objeto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.rotuloCampo}>Título</Text>
        {campo('Ex.: Garrafa de água azul', tituloAnuncio, setTituloAnuncio, {
          maxLength: 100,
        })}

        <Text style={styles.rotuloCampo}>Descrição</Text>
        {campo(
          'Descreva as características do objeto',
          descricaoAnuncio,
          setDescricaoAnuncio,
          { multiline: true, numberOfLines: 4, maxLength: 2000 }
        )}

        <Text style={styles.rotuloCampo}>Categoria</Text>

        <View style={styles.listaCategorias}>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria}
              style={[
                styles.opcaoCategoria,
                categoriaAnuncio === categoria &&
                  styles.categoriaSelecionada,
              ]}
              onPress={() => setCategoriaAnuncio(categoria)}
            >
              <Text
                style={[
                  styles.textoCategoria,
                  categoriaAnuncio === categoria &&
                    styles.textoCategoriaSelecionada,
                ]}
              >
                {categoria}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.rotuloCampo}>Local</Text>
        {campo('Ex.: Biblioteca da Fatec', localAnuncio, setLocalAnuncio, {
          maxLength: 200,
        })}

        <Text style={styles.rotuloCampo}>Data da ocorrência</Text>
        {campo('AAAA-MM-DD', dataAnuncio, setDataAnuncio, {
          maxLength: 10,
        })}

        <Text style={styles.textoAuxiliar}>
          Exemplo de data: 2026-10-29.
        </Text>

        <Text style={styles.rotuloCampo}>Contato</Text>
        {campo('E-mail ou telefone para contato', contatoAnuncio, setContatoAnuncio, {
          maxLength: 200,
        })}

        <Text style={styles.rotuloCampo}>Foto do objeto (opcional)</Text>

        <TouchableOpacity
          style={styles.botaoImagem}
          onPress={selecionarImagem}
          disabled={enviando || enviandoImagem}
        >
          <Text style={styles.textoBotaoImagem}>
            {imagemSelecionada ? 'Escolher outra foto' : 'Selecionar foto do objeto'}
          </Text>
        </TouchableOpacity>

        {imagemSelecionada && (
          <View style={styles.containerPrevia}>
            <Image
              source={{ uri: imagemSelecionada.uri }}
              style={styles.previaImagem}
              resizeMode="contain"
            />

            <TouchableOpacity
              style={styles.botaoRemoverFoto}
              onPress={() => setImagemSelecionada(null)}
            >
              <Text style={styles.textoRemoverFoto}>Remover foto</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.botao, enviando && styles.botaoDesativado]}
          onPress={publicarAnuncio}
          disabled={enviando || enviandoImagem}
        >
          <Text style={styles.textoBotao}>
            {enviando ? 'Publicando...' : 'Publicar anúncio'}
          </Text>
        </TouchableOpacity>

        {enviando && (
          <ActivityIndicator color="#2457C5" style={styles.carregamento} />
        )}

        {botao('Cancelar', () => setTela('inicio'), styles.botaoCancelar)}
      </ScrollView>
    );
  }

  // =====================================================
  // TELA DE LOGIN
  // =====================================================

  function renderLogin() {
    return (
      <ScrollView contentContainerStyle={styles.formularioConteudo}>
        <View style={styles.formulario}>
          <Text style={styles.tituloFormulario}>Entrar</Text>

          <Text style={styles.textoFormulario}>
            Acesse sua conta para publicar anúncios, se estiver aprovado.
          </Text>

          <Text style={styles.rotuloCampo}>E-mail</Text>
          {campo('seuemail@exemplo.com', email, setEmail, {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}

          <Text style={styles.rotuloCampo}>Senha</Text>
          {campo('Digite sua senha', senha, setSenha, {
            secureTextEntry: true,
            autoCapitalize: 'none',
          })}

          <TouchableOpacity
            style={[styles.botao, enviando && styles.botaoDesativado]}
            onPress={entrar}
            disabled={enviando}
          >
            <Text style={styles.textoBotao}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkFormulario}
            onPress={() => {
              setNome('');
              setEmail('');
              setSenha('');
              setTela('cadastro');
            }}
          >
            <Text style={styles.textoLink}>
              Ainda não tem conta? Cadastre-se
            </Text>
          </TouchableOpacity>

          {botao('Voltar aos anúncios', () => setTela('inicio'), styles.botaoCancelar)}
        </View>
      </ScrollView>
    );
  }

  // =====================================================
  // TELA DE CADASTRO
  // =====================================================

  function renderCadastro() {
    return (
      <ScrollView contentContainerStyle={styles.formularioConteudo}>
        <View style={styles.formulario}>
          <Text style={styles.tituloFormulario}>Criar conta</Text>

          <Text style={styles.textoFormulario}>
            Cadastre-se para solicitar acesso à publicação de anúncios.
          </Text>

          <Text style={styles.rotuloCampo}>Nome</Text>
          {campo('Seu nome completo', nome, setNome, { maxLength: 100 })}

          <Text style={styles.rotuloCampo}>E-mail</Text>
          {campo('seuemail@exemplo.com', email, setEmail, {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}

          <Text style={styles.rotuloCampo}>Senha</Text>
          {campo('Mínimo de 8 caracteres', senha, setSenha, {
            secureTextEntry: true,
            autoCapitalize: 'none',
          })}

          <TouchableOpacity
            style={[styles.botao, enviando && styles.botaoDesativado]}
            onPress={cadastrar}
            disabled={enviando}
          >
            <Text style={styles.textoBotao}>
              {enviando ? 'Cadastrando...' : 'Criar conta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkFormulario}
            onPress={() => setTela('login')}
          >
            <Text style={styles.textoLink}>Já tem uma conta? Entrar</Text>
          </TouchableOpacity>

          {botao('Voltar aos anúncios', () => setTela('inicio'), styles.botaoCancelar)}
        </View>
      </ScrollView>
    );
  }

  // =====================================================
  // RENDERIZAÇÃO PRINCIPAL
  // =====================================================

  return (
    <SafeAreaView style={styles.container}>
      {renderCabecalho()}

      {tela === 'inicio' && renderInicio()}
      {tela === 'publicar' && renderPublicar()}
      {tela === 'login' && renderLogin()}
      {tela === 'cadastro' && renderCadastro()}
    </SafeAreaView>
  );
}

// =======================================================
// ESTILOS
// =======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  cabecalho: {
    backgroundColor: '#173B79',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },

  cabecalhoTexto: {
    flex: 1,
    minWidth: 130,
  },

  nomeAplicativo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },

  subtituloAplicativo: {
    color: '#DCE7FF',
    fontSize: 14,
    marginTop: 2,
  },

  acoesCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  botaoCabecalho: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },

  textoBotaoCabecalho: {
    color: '#173B79',
    fontWeight: 'bold',
  },

  botaoSair: {
    backgroundColor: '#DCE7FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },

  textoBotaoSair: {
    color: '#173B79',
    fontWeight: 'bold',
  },

  conteudo: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  boasVindas: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E5EF',
  },

  tituloPrincipal: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#173B79',
    marginBottom: 8,
  },

  textoBoasVindas: {
    color: '#424B5A',
    fontSize: 15,
    lineHeight: 22,
  },

  textoAuxiliar: {
    color: '#657083',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 8,
  },

  aviso: {
    backgroundColor: '#FFF3CD',
    borderColor: '#E8C65B',
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    marginBottom: 16,
  },

  textoAviso: {
    color: '#664D03',
    lineHeight: 21,
  },

  cabecalhoFiltros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  tituloSecao: {
    color: '#173B79',
    fontSize: 20,
    fontWeight: 'bold',
  },

  textoLimpar: {
    color: '#2457C5',
    fontWeight: 'bold',
    padding: 5,
  },

  inputPesquisa: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD3E0',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 15,
    color: '#263448',
  },

  rotuloFiltro: {
    color: '#263448',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 7,
  },

  linhaFiltros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  opcaoFiltro: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD3E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  opcaoFiltroSelecionada: {
    backgroundColor: '#173B79',
    borderColor: '#173B79',
  },

  textoOpcaoFiltro: {
    color: '#364152',
    fontSize: 13,
  },

  textoOpcaoFiltroSelecionada: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  tituloLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 7,
  },

  textoAtualizar: {
    color: '#2457C5',
    fontWeight: 'bold',
    padding: 6,
  },

  contagemResultados: {
    color: '#657083',
    fontSize: 13,
    marginBottom: 12,
  },

  lista: {
    paddingBottom: 30,
  },

  cartaoAnuncio: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E5EF',
  },

  etiqueta: {
    alignSelf: 'flex-start',
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 10,
  },

  etiquetaPerdido: {
    backgroundColor: '#FCE8E6',
  },

  etiquetaEncontrado: {
    backgroundColor: '#DDF4E4',
  },

  textoEtiqueta: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#263238',
  },

  tituloCartao: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#173B79',
    marginBottom: 10,
  },

  fotoAnuncio: {
    width: '100%',
    height: 220,
    borderRadius: 9,
    marginBottom: 12,
    backgroundColor: '#EEF1F6',
  },

  descricaoCartao: {
    color: '#424B5A',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },

  linhaInformacao: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },

  rotulo: {
    fontWeight: 'bold',
    color: '#364152',
    marginRight: 5,
  },

  valor: {
    color: '#596579',
    flexShrink: 1,
  },

  textoAtivo: {
    color: '#237547',
    fontWeight: 'bold',
  },

  textoRecuperado: {
    color: '#2457C5',
    fontWeight: 'bold',
  },

  // NOVOS ESTILOS: GERENCIAMENTO DOS ANÚNCIOS

  areaGerenciamento: {
    borderTopWidth: 1,
    borderTopColor: '#E0E5EF',
    marginTop: 16,
    paddingTop: 13,
  },

  tituloGerenciamento: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#173B79',
    marginBottom: 10,
  },

  botaoRecuperado: {
    backgroundColor: '#DDF4E4',
    borderWidth: 1,
    borderColor: '#A8DDB8',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 9,
  },

  textoBotaoRecuperado: {
    color: '#237547',
    fontWeight: 'bold',
  },

  mensagemRecuperado: {
    color: '#237547',
    fontSize: 13,
    marginBottom: 10,
  },

  botaoExcluir: {
    backgroundColor: '#FCE8E6',
    borderWidth: 1,
    borderColor: '#F1B7B2',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  textoBotaoExcluir: {
    color: '#B42318',
    fontWeight: 'bold',
  },

  vazio: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },

  tituloVazio: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#173B79',
    textAlign: 'center',
  },

  textoVazio: {
    color: '#657083',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },

  formulario: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  formularioConteudo: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  tituloFormulario: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#173B79',
    marginBottom: 8,
  },

  textoFormulario: {
    color: '#657083',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },

  rotuloCampo: {
    color: '#263448',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4DAE5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#263448',
    minHeight: 46,
  },

  inputMultiline: {
    minHeight: 105,
    textAlignVertical: 'top',
  },

  botao: {
    backgroundColor: '#2457C5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  textoBotao: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  botaoDesativado: {
    opacity: 0.6,
  },

  botaoCancelar: {
    backgroundColor: '#657083',
    marginBottom: 20,
  },

  linkFormulario: {
    alignItems: 'center',
    paddingVertical: 17,
  },

  textoLink: {
    color: '#2457C5',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  opcoesLinha: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },

  opcaoTipo: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD3E0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  opcaoSelecionada: {
    backgroundColor: '#173B79',
    borderColor: '#173B79',
  },

  textoOpcao: {
    color: '#364152',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  textoOpcaoSelecionada: {
    color: '#FFFFFF',
  },

  listaCategorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  opcaoCategoria: {
    borderWidth: 1,
    borderColor: '#CBD3E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },

  categoriaSelecionada: {
    backgroundColor: '#DCE7FF',
    borderColor: '#2457C5',
  },

  textoCategoria: {
    fontSize: 13,
    color: '#364152',
  },

  textoCategoriaSelecionada: {
    color: '#173B79',
    fontWeight: 'bold',
  },

  botaoImagem: {
    backgroundColor: '#E8F0FE',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#C5D5FA',
  },

  textoBotaoImagem: {
    color: '#1A56DB',
    fontWeight: 'bold',
  },

  containerPrevia: {
    marginTop: 12,
    marginBottom: 8,
  },

  previaImagem: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#EEF1F6',
  },

  botaoRemoverFoto: {
    alignSelf: 'flex-end',
    padding: 10,
  },

  textoRemoverFoto: {
    color: '#B42318',
    fontWeight: 'bold',
  },

  carregamento: {
    marginVertical: 20,
  },
});
