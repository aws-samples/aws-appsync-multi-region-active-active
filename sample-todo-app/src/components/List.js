import React, { useState } from 'react';
import { Form } from './Form';
import { Todo } from './Todo';
import { Heading, Card, ScrollView } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { deleteTodo } from '../graphql/mutations';
import { API } from 'aws-amplify';
import { Subscriptions } from './Subscriptions'

export const List = () => {
  const [todoData, setTodoData] = useState([])

  const handleTodoDelete = async (todoId) => {
    const newTodoData = todoData.filter((todo) => todo.id !== todoId)
    try {
      await API.graphql({
        query: deleteTodo,
        variables: {
          input: {
            id: todoId
          }
        },
        authToken: "custom-authorized"
      })
      setTodoData(newTodoData)
    }
    catch (error) {
      console.log(error)
    }
  }

  return (
    <div id="app">
      < div id="header" > <Heading level={2}>AWS AppSync Multi-Region Active-Active Demo</Heading></div >
      <div className="main-card">
        <Card variation="elevated" >
          <Form todoData={todoData}
            setTodoData={setTodoData} />
          <ScrollView maxWidth="100%">
            <Todo
              todoData={todoData}
              setTodoData={setTodoData}
              removeTodo={handleTodoDelete} />
          </ScrollView>
        </Card>
      </div>
      <div className="sub-card">
        <Card variation="elevated">
          <Subscriptions todoData={todoData} handleTodoDelete={handleTodoDelete} />
        </Card>
      </div>

    </div>

  );
}

