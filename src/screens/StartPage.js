import React, { Component } from 'react';
import { Platform, ActivityIndicator, ScrollView, Keyboard, Image, AsyncStorage, TouchableOpacity, Alert, Dimensions, StyleSheet, View, FlatList } from 'react-native';
import startTabs from '../nav/tabs';
import { Navigation } from 'react-native-navigation';
import { connect } from 'react-redux';
import SQLite from 'react-native-sqlite-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {LinearGradient} from 'react-native-linear-gradient';
import {List, ListItem, Toast, Right, Fab, Grid, Col, Thumbnail, 
  Form, Title, Spinner, Item, Input, Label, Container, Header, Card,Body, 
  CardItem, Button, Content, Icon, ActionSheet, Text, Root } from 'native-base';

import {
  RkButton,
  RkText,
  RkTextInput,
  RkAvoidKeyboard,
  RkStyleSheet,
  RkTheme
} from 'react-native-ui-kitten';  
import { API_URL, CONTENT_TYPE, APP_TOKEN } from '../config/const';
import { Base64 } from '../config/base64';
import { setSessionToken, setUserObject } from '../actions/user';
import logFetch from '../config/logFetch';



/**
 * Ponto de partida para a verificação de usuário logado ou não
 */
class Start extends Component {
  static navigatorStyle = {

    navBarHidden: true,
    statusBarColor: '#000'
  };

   items = null;
   height = +Dimensions.get('window').height;
   width = +Dimensions.get('window').width;
   
   constructor(){
      super();

      this.state = {
        siape: '',
        pass: '',
        bootstrapping: true,
        carregando: false
      }

    }
    
    async componentWillMount(){
        try {

          const siape = await AsyncStorage.getItem('siape');
          const pass  = await AsyncStorage.getItem('password');

          console.log('LOCAL STORAGE', siape, pass);

          if (!! siape && !!pass){
           await this.setState({
              siape,
              pass
            });
          }
        } catch (error) {
          //Caso ocorra um erro apenas log
          console.log(error);
        } finally {
          this.setState({
            bootstrapping: false,
          });
        }

    }

    componentDidMount() {
    }

    genBase64 = () => {
      return Base64.encode(this.state.siape+':'+this.state.pass);
    }

    GetFullProfile = async token => {
      
      let result = await fetch(API_URL + '/getFullSession/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          "Session-Token": token,
        }
      });
    
      let resultCvt = await result.json();
      
      console.log(resultCvt);

      return resultCvt;
    }
    
    authenticateUser =  () => {

      // console.log(this.state, this.genBase64());

      this.setState({carregando: true});

      let credentials = this.genBase64();


      var myHeaders = new Headers();

      myHeaders.append("Accept", "application/json");
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Authorization", 'Basic ' + credentials);
      
      fetch(API_URL+'/initSession', {
        method: 'GET',
        headers: myHeaders,
        cors: true
      })
      .then(rawData => rawData.json())
      .then( async data => {
        
        if ( typeof data === 'object' && typeof data.session_token === 'string'){
          try {
            
            let {session_token} = data;

            //Para deixar salvo
            await AsyncStorage.setItem('siape', this.state.siape);
          
            await AsyncStorage.setItem('password', this.state.pass);

            //Deixa disponível globalmente o valor do token
            this.props.setToken(session_token);

            
            let objHeader = {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'session_token': session_token,
            };


            //Devido a um bug do GLPI, quando posto no header, o session_token
            //não identificado, coloca-se diretamente na URL como param
            //?session_token= 
            let result = await fetch(API_URL + '/getFullSession/?session_token=' + session_token, {
              headers: objHeader
            });
            
            
            let profileData = await result.json();

            let resultProfile = await fetch(API_URL + '/User/'+profileData.session.glpiID+'?session_token=' + session_token, {
              headers: objHeader
            });

            let resultProfileCvt = await resultProfile.json();
            
            if(!!profileData){
              this.props.setUser({
                userGLPI: profileData.session,
                userProfile: resultProfileCvt
              });
              
              // Se ocorrer com sucesso
              startTabs();
            }
            else
              throw new Error('Erro ao carregar perfil');

          } catch (error) {
          
            throw new Error(error);
          
          } 


        }else{
          Toast.show({
                text:  'Ocorreu um erro desconhecido! Tente novamente!',
                buttonText: 'Certo',
                type: "danger"
          });
        }
      })
      .catch( err => {
        console.log(err);
        Toast.show({
            text: err.message || 'Ocorreu um erro desconhecido!',
            buttonText: 'Certo',
            type: "danger"
        });
      }).then( () => { 
           this.setState({carregando: false})
      });
    }

    render() {
      if(this.state.bootstrapping){
        return (
        <View style={{backgroundColor: "white", flex: 1, alignItems:'center', justifyContent:'center'}}>
          <ActivityIndicator />
        </View>
        );
      }else{
        return (
          <RkAvoidKeyboard
          onStartShouldSetResponder={ (e) => true}
          onResponderRelease={ (e) => Keyboard.dismiss()}
          style={styles.screen}>
          <Root>
            
          <Image style={[styles.image, { width: this.width-30}]}
                        source={require('../assets/logo.png')}/>
          <View style={{flex: 1, padding: 20,  alignContent:'center', alignItems:'center', justifyContent:'center'}}>
          <RkText style={{  backgroundColor: 'transparent',
          color: '#000', fontSize: 26, fontWeight: 'bold',}}>
            <FontAwesome name='edit' size={32} color={'rgb(56,126,220)'} ></FontAwesome> Sistema de Chamados - STI 
            </RkText>
          <RkText style={{ marginVertical: 10,   backgroundColor: 'transparent',
          color: '#ccc'}}>
              Utilize suas credenciais do SUAP: Sistema Unificado de Administração Pública para acessar o sistema
            </RkText>
            <RkTextInput value={this.state.siape} onChangeText={ siape => this.setState({siape})} rkType='rounded' placeholder='Matrícula SIAPE'/>
            <RkTextInput value={this.state.pass} onChangeText={ pass => this.setState({pass})} rkType='rounded' placeholder='Senha' secureTextEntry={true}/>

            {
              this.state.carregando ? (
                <ActivityIndicator></ActivityIndicator>
              ):(
                <RkButton onPress={this.authenticateUser} rkType='stretch' style={[{ alignItems: 'center', paddingVertical: 0, paddingHorizontal: 0, borderRadius: 20, justifyContent:'center' }]} >
                <RkText style={{  backgroundColor: 'transparent', color: '#fff'}}> ENTRAR NO SISTEMA </RkText>
              </RkButton>
              )
            }
          </View>
          
          </Root>

          
        </RkAvoidKeyboard>
        )
      }
    }
  }

  /** listen state */
  const mapStateToProps = (state) => ({
    userConfig: state.user
  })
  
  /** dispatch actions */
  const mapDispatchToProps = dispatch => ({
    setToken: (token) => dispatch(setSessionToken(token)),
    setUser: (user) => dispatch(setUserObject(user))
  });
  


  let styles = RkStyleSheet.create(theme => ({
    screen: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: '#FFF'
    },
    image: {
      resizeMode: 'contain',
      marginBottom: 10,
    },
    container: {
      paddingHorizontal: 17,
      paddingBottom: 22,
      alignItems: 'center',
      flex: -1
    },
    footer: {
      justifyContent: 'flex-end',
      flex: 1
    },
    buttons: {
      flexDirection: 'row',
      marginBottom: 24
    },
    button: {
      marginHorizontal: 14
    },
    save: {
      marginVertical: 9
    },
    textRow: {
      justifyContent: 'center',
      flexDirection: 'row',
    }
  }));
  
  export default connect(mapStateToProps, mapDispatchToProps)(Start)
  
  